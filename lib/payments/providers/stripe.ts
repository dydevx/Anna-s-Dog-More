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

  assertConfigured() {
    client();
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_NOT_CONFIGURED");
    const base = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!base) throw new Error("SITE_URL_NOT_CONFIGURED");
    let url: URL;
    try { url = new URL(base); } catch { throw new Error("SITE_URL_NOT_CONFIGURED"); }
    if (url.origin !== base.replace(/\/+$/, "") || !["http:", "https:"].includes(url.protocol)
      || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("SITE_URL_NOT_CONFIGURED");
  }

  async createPayment(order: PaymentOrder): Promise<PaymentSession> {
    const stripe = client();
    const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
    if (!base) throw new Error("SITE_URL_NOT_CONFIGURED");
    const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = paymentMethodsForCurrency(order.currency);
    const itemTotal = order.items.reduce((sum, item) => sum + toMinorUnits(item.unitPrice) * item.quantity, 0);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: toMinorUnits(item.unitPrice),
        product_data: { name: item.name, description: item.description || undefined },
      },
    }));
    const shipping = toMinorUnits(order.amount) - itemTotal;
    if (shipping < 0) throw new Error("PAYMENT_TOTAL_MISMATCH");
    if (shipping > 0) lineItems.push({ quantity: 1, price_data: { currency: order.currency.toLowerCase(), unit_amount: shipping, product_data: { name: order.locale === "de" ? "Versand" : "Shipping" } } });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      payment_method_types: methods,
      line_items: lineItems,
      locale: order.locale,
      // Persisted with the order so retries use exactly the same Stripe parameters.
      expires_at: order.paymentExpiresAt,
      success_url: `${base}/${order.locale}/checkout/confirmation?token=${order.publicToken}`,
      cancel_url: `${base}/${order.locale}/checkout?payment=cancelled`,
      metadata: { order_id: order.id, order_number: order.orderNumber },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.orderNumber } },
    }, { idempotencyKey: `order:${order.id}` });
    if (!session.url) throw new Error("PAYMENT_SESSION_MISSING_URL");
    return { provider: this.name, providerPaymentId: session.id, redirectUrl: session.url, methods, expiresAt: session.expires_at };
  }

  async expirePayment(providerPaymentId: string) {
    await client().checkout.sessions.expire(providerPaymentId);
  }

  async getPayment(providerPaymentId: string) {
    const session = await client().checkout.sessions.retrieve(providerPaymentId);
    return { status: session.status === "expired" ? "expired" : session.payment_status, redirectUrl: session.url };
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
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!intentId) return null;
      const sessions = await client().checkout.sessions.list({ payment_intent: intentId, limit: 1 });
      const session = sessions.data[0];
      if (!session?.metadata?.order_id) return null;
      return {
        eventId: event.id, eventType: event.type, providerPaymentId: session.id,
        orderId: session.metadata.order_id, method: "unknown", amount: charge.amount_refunded / 100,
        currency: charge.currency.toUpperCase(), paid: false, outcome: "refunded",
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      };
    }
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) return null;
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (!orderId) throw new Error("WEBHOOK_ORDER_ID_MISSING");
    return {
      eventId: event.id,
      eventType: event.type,
      providerPaymentId: session.id,
      orderId,
      // Offered methods are not evidence of the method the customer used.
      method: "unknown",
      amount: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "").toUpperCase(),
      paid: session.payment_status === "paid",
      outcome: session.payment_status === "paid" ? "paid" : event.type === "checkout.session.expired" ? "cancelled" : event.type === "checkout.session.async_payment_failed" ? "failed" : "pending",
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    };
  }
}
