import "server-only";
import { createHash } from "node:crypto";
import Stripe from "stripe";
import { toMinorUnits } from "@/lib/money";
import type { PaymentOrder, PaymentProvider, PaymentSession, VerifiedPaymentEvent } from "@/lib/payments/provider";
import { paymentMethodsForCurrency } from "@/lib/payments/methods";

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(key);
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createPayment(order: PaymentOrder): Promise<PaymentSession> {
    const stripe = client();
    const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
    if (!base) throw new Error("SITE_URL_NOT_CONFIGURED");
    const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = paymentMethodsForCurrency(order.currency);
    const itemTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: toMinorUnits(item.unitPrice),
        product_data: { name: item.name, description: item.description || undefined },
      },
    }));
    const shipping = order.amount - itemTotal;
    if (shipping > 0) lineItems.push({ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: toMinorUnits(shipping), product_data: { name: order.locale === "de" ? "Versand" : "Shipping" } } });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      payment_method_types: methods,
      line_items: lineItems,
      locale: order.locale,
      success_url: `${base}/${order.locale}/checkout/confirmation?token=${order.publicToken}`,
      cancel_url: `${base}/${order.locale}/checkout?payment=cancelled`,
      metadata: { order_id: order.id, order_number: order.orderNumber },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.orderNumber } },
    }, { idempotencyKey: `order:${order.id}` });
    if (!session.url) throw new Error("PAYMENT_SESSION_MISSING_URL");
    return { provider: this.name, providerPaymentId: session.id, redirectUrl: session.url, methods };
  }

  async getPayment(providerPaymentId: string) {
    const session = await client().checkout.sessions.retrieve(providerPaymentId);
    return { status: session.payment_status };
  }

  async refundPayment(providerPaymentId: string, amount?: number) {
    const stripe = client();
    const session = await stripe.checkout.sessions.retrieve(providerPaymentId);
    if (!session.payment_intent || typeof session.payment_intent !== "string") throw new Error("PAYMENT_INTENT_NOT_FOUND");
    const refund = await stripe.refunds.create({ payment_intent: session.payment_intent, amount: amount ? toMinorUnits(amount) : undefined }, { idempotencyKey: `refund:${providerPaymentId}:${amount ?? "full"}` });
    return { id: refund.id, status: refund.status ?? "pending" };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentEvent | null> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_NOT_CONFIGURED");
    const event = await client().webhooks.constructEventAsync(rawBody, signature, secret);
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return null;
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (!orderId) throw new Error("WEBHOOK_ORDER_ID_MISSING");
    return {
      eventId: event.id,
      eventType: event.type,
      providerPaymentId: session.id,
      orderId,
      method: session.payment_method_types?.[0] ?? "unknown",
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "").toUpperCase(),
      paid: session.payment_status === "paid",
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    };
  }
}
