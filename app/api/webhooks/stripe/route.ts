import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments";
import { getEmailProvider } from "@/lib/email/provider";
import { formatMoney } from "@/lib/money";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  const rawBody = await request.text();
  try {
    const event = await getPaymentProvider().verifyWebhook(rawBody, signature);
    if (!event || !event.paid) return NextResponse.json({ received: true });
    const admin = createAdminClient();
    const { error } = await admin.rpc("finalize_paid_order", {
      p_order_id: event.orderId,
      p_provider: "stripe",
      p_provider_payment_id: event.providerPaymentId,
      p_provider_event_id: event.eventId,
      p_method: event.method,
      p_amount: event.amount,
      p_currency: event.currency,
      p_event_type: event.eventType,
      p_payload_hash: event.payloadHash,
    });
    if (error) throw error;
    const emailProvider = getEmailProvider();
    if (emailProvider) {
      const { data: order, error: orderError } = await admin.from("orders").select("email,locale,order_number,grand_total,currency,shipping_address,order_items(product_name,variant_description,sku,quantity,line_total)").eq("id", event.orderId).single();
      if (orderError || !order) throw orderError ?? new Error("EMAIL_ORDER_NOT_FOUND");
      const locale: "de" | "en" = order.locale === "en" ? "en" : "de";
      const address = order.shipping_address as Record<string, string>;
      const message = {
        to: order.email,
        locale,
        orderNumber: order.order_number,
        total: formatMoney(Number(order.grand_total), order.currency, locale),
        shippingAddress: [`${address.firstName ?? ""} ${address.lastName ?? ""}`.trim(), `${address.street ?? ""} ${address.houseNumber ?? ""}`.trim(), `${address.postalCode ?? ""} ${address.city ?? ""}`.trim(), address.country ?? ""].filter(Boolean),
        lines: (order.order_items ?? []).map((item) => ({ name: item.product_name, variant: item.variant_description, sku: item.sku, quantity: item.quantity, lineTotal: formatMoney(Number(item.line_total), order.currency, locale) })),
      };
      await Promise.all([emailProvider.sendOrderPaid(message), emailProvider.sendShopNotification(message)]);
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "WEBHOOK_VERIFICATION_OR_PROCESSING_FAILED" }, { status: 400 });
  }
}
