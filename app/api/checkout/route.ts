import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!await rateLimit(`checkout:${requestIp(request)}`, 6, 60)) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_CHECKOUT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const admin = createAdminClient();
    const input = parsed.data;
    const customer = await createUserClient().then((client) => client.auth.getUser()).then(({ data }) => data.user).catch(() => null);
    const { data, error } = await admin.rpc("create_pending_order", {
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
    const { data: items, error: itemsError } = await admin.from("order_items").select("product_name,variant_description,unit_price,quantity").eq("order_id", order.order_id);
    if (itemsError) throw itemsError;
    const payment = await getPaymentProvider().createPayment({
      id: order.order_id,
      publicToken: order.public_token,
      orderNumber: order.order_number,
      email: input.email,
      locale: input.locale,
      amount: Number(order.grand_total),
      currency: order.currency,
      items: (items ?? []).map((item) => ({ name: item.product_name, description: item.variant_description, unitPrice: Number(item.unit_price), quantity: item.quantity })),
    });
    await admin.from("payments").insert({ order_id: order.order_id, provider: payment.provider, provider_payment_id: payment.providerPaymentId, amount: order.grand_total, currency: order.currency, status: "pending" });
    return NextResponse.json({ redirectUrl: payment.redirectUrl });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const safeCode = ["OUT_OF_STOCK", "INVALID_VARIANT", "PRODUCT_UNAVAILABLE", "SHIPPING_UNAVAILABLE", "MIXED_CURRENCY", "STRIPE_NOT_CONFIGURED", "SITE_URL_NOT_CONFIGURED", "SUPABASE_SERVER_NOT_CONFIGURED"].find((code) => raw.includes(code)) ?? "CHECKOUT_FAILED";
    return NextResponse.json({ error: safeCode }, { status: safeCode.endsWith("NOT_CONFIGURED") ? 503 : 409 });
  }
}
