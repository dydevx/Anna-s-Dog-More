import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import type { PaymentSession } from "@/lib/payments/provider";
import { getBankTransferDetails, getEmailProvider } from "@/lib/email/provider";
import { formatMoney } from "@/lib/money";
import { createHash, randomUUID } from "node:crypto";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CHECKOUT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  let orderId: string | undefined;
  let payment: PaymentSession | undefined;
  let creatingPayment = false;
  let retainOrder = false;
  try {
    if (!await rateLimit(`checkout:${requestIp(request)}`, 6, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    const paymentMode = process.env.PAYMENT_PROVIDER ?? "bank_transfer";
    const bankDetails = paymentMode === "bank_transfer" ? getBankTransferDetails() : null;
    const emailProvider = paymentMode === "bank_transfer" ? getEmailProvider() : null;
    if (paymentMode === "bank_transfer" && !bankDetails) throw new Error("BANK_TRANSFER_DETAILS_NOT_CONFIGURED");
    if (paymentMode === "bank_transfer" && !emailProvider) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
    const provider = paymentMode === "stripe" ? getPaymentProvider() : null;
    if (paymentMode !== "bank_transfer" && !provider) throw new Error(`UNSUPPORTED_PAYMENT_PROVIDER:${paymentMode}`);
    provider?.assertConfigured();
    const admin = createAdminClient();
    const input = parsed.data;
    const customer = await createUserClient().then((client) => client.auth.getUser()).then(({ data }) => data.user).catch(() => null);
    const { checkoutKey, ...checkoutDetails } = input;
    const checkoutHash = createHash("sha256").update(JSON.stringify({ ...checkoutDetails, customerId: customer?.id ?? null })).digest("hex");
    const { data, error } = await admin.rpc("create_checkout_order", {
      p_checkout_key: checkoutKey ?? randomUUID(),
      p_checkout_hash: checkoutHash,
      p_locale: input.locale,
      p_email: input.email,
      p_phone: input.phone,
      p_shipping_address: input.shippingAddress,
      p_billing_address: input.billingAddress,
      p_shipping_method_id: input.shippingMethodId,
      p_items: input.items,
      p_customer_id: customer?.id ?? null,
    });
    if (error) throw new Error(error.message);
    const order = data?.[0];
    if (!order) throw new Error("ORDER_CREATION_FAILED");
    orderId = order.order_id;
    const { data: items, error: itemsError } = await admin.from("order_items").select("product_name,variant_description,sku,unit_price,quantity,line_total").eq("order_id", order.order_id);
    if (itemsError) throw itemsError;

    if (paymentMode === "bank_transfer") {
      const providerPaymentId = `bank:${order.order_id}`;
      const { error: pendingError } = await admin.rpc("apply_payment_event", {
        p_order_id: order.order_id,
        p_provider: "bank_transfer",
        p_provider_payment_id: providerPaymentId,
        p_provider_event_id: `bank-transfer-created:${order.order_id}`,
        p_outcome: "pending",
        p_amount: Number(order.grand_total),
        p_currency: order.currency,
        p_event_type: "bank_transfer.pending",
        p_payload_hash: checkoutHash,
      });
      if (pendingError) throw pendingError;
      retainOrder = true;
      const locale: "de" | "en" = input.locale === "en" ? "en" : "de";
      const address = input.shippingAddress;
      const salutation = address.salutation === "herr" ? (locale === "de" ? "Herr" : "Mr") : address.salutation === "frau" ? (locale === "de" ? "Frau" : "Ms") : address.salutation === "divers" ? (locale === "de" ? "Divers" : "Other") : "";
      const message = {
        to: input.email,
        locale,
        orderNumber: order.order_number,
        paymentStatus: "awaiting_bank_transfer" as const,
        total: formatMoney(Number(order.grand_total), order.currency, locale),
        shippingAddress: [`${salutation} ${address.firstName} ${address.lastName}`.trim(), address.company, `${address.street} ${address.houseNumber}`.trim(), `${address.postalCode} ${address.city}`.trim(), "Schweiz"].filter(Boolean),
        lines: (items ?? []).map((item) => ({ name: item.product_name, variant: item.variant_description, sku: item.sku, quantity: item.quantity, lineTotal: formatMoney(Number(item.line_total), order.currency, locale) })),
      };
      await Promise.all([emailProvider!.sendOrderConfirmation(message), emailProvider!.sendShopNotification(message)]);
      return NextResponse.json({ redirectUrl: `/${input.locale}/checkout/confirmation?token=${order.public_token}`, token: order.public_token }, { headers: { "Cache-Control": "private, no-store" } });
    }

    creatingPayment = true;
    const { data: existing, error: existingError } = await admin.from("payments").select("provider_payment_id")
      .eq("order_id", order.order_id).eq("provider", provider!.name).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      // Never release a payable session just because retrieving it failed.
      creatingPayment = true;
      const previous = await provider!.getPayment(existing.provider_payment_id);
      if (previous.status === "expired") throw new Error("CHECKOUT_EXPIRED");
      const confirmation = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")}/${input.locale}/checkout/confirmation?token=${order.public_token}`;
      return NextResponse.json({ redirectUrl: previous.redirectUrl ?? confirmation, token: order.public_token }, { headers: { "Cache-Control": "private, no-store" } });
    }
    creatingPayment = false;
    creatingPayment = true;
    payment = await provider!.createPayment({
      id: order.order_id,
      publicToken: order.public_token,
      orderNumber: order.order_number,
      email: input.email,
      locale: input.locale,
      amount: Number(order.grand_total),
      currency: order.currency,
      paymentExpiresAt: Number(order.payment_expires_at),
      items: (items ?? []).map((item) => ({ name: item.product_name, description: item.variant_description, unitPrice: Number(item.unit_price), quantity: item.quantity })),
    });
    const { error: paymentError } = await admin.rpc("register_payment_session", {
      p_order_id: order.order_id, p_provider: payment.provider, p_provider_payment_id: payment.providerPaymentId,
      p_expires_at: new Date(payment.expiresAt * 1000).toISOString(),
    });
    if (paymentError) throw paymentError;
    return NextResponse.json({ redirectUrl: payment.redirectUrl, token: order.public_token }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // Release only when no payable session exists. An API timeout can have created
    // a session at Stripe, so ambiguous creation failures retain the bounded hold.
    if (orderId && !retainOrder && (!creatingPayment || payment)) {
      try {
        if (payment) await getPaymentProvider().expirePayment(payment.providerPaymentId);
        const { error: cleanupError } = await createAdminClient().rpc("release_unpaid_order", { p_order_id: orderId });
        if (cleanupError) console.error("checkout cleanup failed", { orderId });
      } catch { console.error("checkout cleanup deferred", { orderId }); }
    }
    const raw = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const safeCode = ["OUT_OF_STOCK", "INVALID_VARIANT", "PRODUCT_UNAVAILABLE", "SHIPPING_UNAVAILABLE", "MIXED_CURRENCY", "CHECKOUT_EXPIRED", "CHECKOUT_KEY_REUSED", "BANK_TRANSFER_DETAILS_NOT_CONFIGURED", "EMAIL_PROVIDER_NOT_CONFIGURED", "EMAIL_PROVIDER_UNSUPPORTED", "STRIPE_NOT_CONFIGURED", "STRIPE_WEBHOOK_NOT_CONFIGURED", "SITE_URL_NOT_CONFIGURED", "SUPABASE_SERVER_NOT_CONFIGURED", "UNSUPPORTED_PAYMENT_PROVIDER"].find((code) => raw.includes(code)) ?? "CHECKOUT_FAILED";
    return NextResponse.json({ error: safeCode }, { status: safeCode.endsWith("NOT_CONFIGURED") ? 503 : 409 });
  }
}
