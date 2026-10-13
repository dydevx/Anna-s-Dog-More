import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import type { PaymentSession } from "@/lib/payments/provider";
import { createHash, randomUUID } from "node:crypto";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CHECKOUT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  let orderId: string | undefined;
  let payment: PaymentSession | undefined;
  let creatingPayment = false;
  try {
    if (!await rateLimit(`checkout:${requestIp(request)}`, 6, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    const provider = getPaymentProvider();
    provider.assertConfigured();
    const admin = createAdminClient();
    const input = parsed.data;
    const customer = await createUserClient().then((client) => client.auth.getUser()).then(({ data }) => data.user).catch(() => null);
    const { checkoutKey, ...checkoutDetails } = input;
    const { data, error } = await admin.rpc("create_checkout_order", {
      p_checkout_key: checkoutKey ?? randomUUID(),
      p_checkout_hash: createHash("sha256").update(JSON.stringify({ ...checkoutDetails, customerId: customer?.id ?? null })).digest("hex"),
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
    creatingPayment = true;
    const { data: existing, error: existingError } = await admin.from("payments").select("provider_payment_id")
      .eq("order_id", order.order_id).eq("provider", provider.name).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      // Never release a payable session just because retrieving it failed.
      creatingPayment = true;
      const previous = await provider.getPayment(existing.provider_payment_id);
      if (previous.status === "expired") throw new Error("CHECKOUT_EXPIRED");
      const confirmation = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "")}/${input.locale}/checkout/confirmation?token=${order.public_token}`;
      return NextResponse.json({ redirectUrl: previous.redirectUrl ?? confirmation, token: order.public_token }, { headers: { "Cache-Control": "private, no-store" } });
    }
    creatingPayment = false;
    const { data: items, error: itemsError } = await admin.from("order_items").select("product_name,variant_description,unit_price,quantity").eq("order_id", order.order_id);
    if (itemsError) throw itemsError;
    creatingPayment = true;
    payment = await provider.createPayment({
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
    if (orderId && (!creatingPayment || payment)) {
      try {
        if (payment) await getPaymentProvider().expirePayment(payment.providerPaymentId);
        const { error: cleanupError } = await createAdminClient().rpc("release_unpaid_order", { p_order_id: orderId });
        if (cleanupError) console.error("checkout cleanup failed", { orderId });
      } catch { console.error("checkout cleanup deferred", { orderId }); }
    }
    const raw = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const safeCode = ["OUT_OF_STOCK", "INVALID_VARIANT", "PRODUCT_UNAVAILABLE", "SHIPPING_UNAVAILABLE", "MIXED_CURRENCY", "CHECKOUT_EXPIRED", "CHECKOUT_KEY_REUSED", "STRIPE_NOT_CONFIGURED", "STRIPE_WEBHOOK_NOT_CONFIGURED", "SITE_URL_NOT_CONFIGURED", "SUPABASE_SERVER_NOT_CONFIGURED"].find((code) => raw.includes(code)) ?? "CHECKOUT_FAILED";
    return NextResponse.json({ error: safeCode }, { status: safeCode.endsWith("NOT_CONFIGURED") ? 503 : 409 });
  }
}
