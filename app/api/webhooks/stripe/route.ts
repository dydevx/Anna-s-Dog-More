import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { getEmailProvider } from "@/lib/email/provider";
import { formatMoney } from "@/lib/money";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  const rawBody = await request.text();
  let event;
  try {
    event = await getPaymentProvider().verifyWebhook(rawBody, signature);
  } catch (error) {
    // Invalid signatures are client errors; provider/network failures need retry.
    const invalid = error instanceof Error && error.name === "StripeSignatureVerificationError";
    return NextResponse.json({ error: invalid ? "INVALID_SIGNATURE" : "WEBHOOK_VERIFICATION_FAILED" }, { status: invalid ? 400 : 503 });
  }
  if (!event) return NextResponse.json({ received: true });
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc(event.outcome === "paid" ? "finalize_paid_order" : "apply_payment_event", {
      p_order_id: event.orderId,
      p_provider: "stripe",
      p_provider_payment_id: event.providerPaymentId,
      p_provider_event_id: event.eventId,
      ...(event.outcome === "paid" ? { p_method: event.method } : { p_outcome: event.outcome }),
      p_amount: event.amount,
      p_currency: event.currency,
      p_event_type: event.eventType,
      p_payload_hash: event.payloadHash,
    });
    if (error) throw error;
    revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
    if (event.outcome !== "paid") return NextResponse.json({ received: true });
    const emailProvider = getEmailProvider();
    if (emailProvider) {
      const { data: order, error: orderError } = await admin.from("orders").select("email,locale,order_number,grand_total,currency,payment_status,shipping_address,order_items(product_name,variant_description,sku,quantity,line_total)").eq("id", event.orderId).single();
      if (orderError || !order) throw orderError ?? new Error("EMAIL_ORDER_NOT_FOUND");
      if (order.payment_status !== "paid") return NextResponse.json({ received: true });
      const locale: "de" | "en" = order.locale === "en" ? "en" : "de";
      const address = order.shipping_address as Record<string, string>;
      const salutation = address.salutation === "herr" ? (locale === "de" ? "Herr" : "Mr") : address.salutation === "frau" ? (locale === "de" ? "Frau" : "Ms") : address.salutation === "divers" ? (locale === "de" ? "Divers" : "Other") : "";
      const message = {
        to: order.email,
        locale,
        orderNumber: order.order_number,
        paymentStatus: "paid" as const,
        total: formatMoney(Number(order.grand_total), order.currency, locale),
        shippingAddress: [`${salutation} ${address.firstName ?? ""} ${address.lastName ?? ""}`.trim(), address.company ?? "", `${address.street ?? ""} ${address.houseNumber ?? ""}`.trim(), `${address.postalCode ?? ""} ${address.city ?? ""}`.trim(), address.country ?? ""].filter(Boolean),
        lines: (order.order_items ?? []).map((item) => ({ name: item.product_name, variant: item.variant_description, sku: item.sku, quantity: item.quantity, lineTotal: formatMoney(Number(item.line_total), order.currency, locale) })),
      };
      await Promise.all([emailProvider.sendOrderConfirmation(message), emailProvider.sendShopNotification(message)]);
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("payment webhook processing failed", { eventId: event.eventId, orderId: event.orderId });
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
