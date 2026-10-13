import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { StripePaymentProvider } from "@/lib/payments/providers/stripe";
import { checkoutSchema } from "@/lib/validation/checkout";

const orderId = "20000000-0000-4000-8000-000000000001";
const secret = "whsec_test_only";
const stripe = new Stripe("sk_test_local_only");
function signed(type: string, paymentStatus = "unpaid") {
  const raw = JSON.stringify({ id: `evt_${type}`, object: "event", type,
    data: { object: { id: "cs_test", object: "checkout.session", metadata: { order_id: orderId },
      payment_status: paymentStatus, amount_total: 1495, currency: "chf", payment_method_types: ["card", "twint"] } },
  });
  return { raw, signature: stripe.webhooks.generateTestHeaderString({ payload: raw, secret }) };
}

describe("Stripe signed payment events", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_only");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.ch");
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ["checkout.session.completed", "paid", "paid"],
    ["checkout.session.completed", "unpaid", "pending"],
    ["checkout.session.async_payment_succeeded", "paid", "paid"],
    ["checkout.session.async_payment_failed", "unpaid", "failed"],
    ["checkout.session.expired", "unpaid", "cancelled"],
  ])("normalizes %s with %s status", async (type, status, outcome) => {
    const { raw, signature } = signed(type, status);
    expect(await new StripePaymentProvider().verifyWebhook(raw, signature)).toMatchObject({
      orderId, providerPaymentId: "cs_test", amount: 14.95, currency: "CHF", outcome,
      method: "unknown", paid: outcome === "paid",
    });
  });
  it("rejects tampering with an otherwise valid signature", async () => {
    const { raw, signature } = signed("checkout.session.completed", "paid");
    await expect(new StripePaymentProvider().verifyWebhook(raw.replace("1495", "1"), signature)).rejects.toThrow();
  });
  it("acknowledges unrelated signed events without processing an order", async () => {
    const { raw, signature } = signed("customer.created");
    expect(await new StripePaymentProvider().verifyWebhook(raw, signature)).toBeNull();
  });
  it("requires webhook configuration before checkout can reserve stock", () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect(() => new StripePaymentProvider().assertConfigured()).toThrow("STRIPE_WEBHOOK_NOT_CONFIGURED");
  });
  it("requires a public HTTPS origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://example.ch");
    expect(() => new StripePaymentProvider().assertConfigured()).toThrow("SITE_URL_NOT_CONFIGURED");
  });
  it("rejects duplicate cart variants before database access", () => {
    const address = { firstName: "Anna", lastName: "Test", street: "Street", houseNumber: "1", postalCode: "8000", city: "Zurich", country: "CH" };
    expect(checkoutSchema.safeParse({ locale: "en", email: "test@example.ch", shippingAddress: address, billingAddress: address,
      shippingMethodId: orderId, items: [{ variantId: orderId, quantity: 1 }, { variantId: orderId, quantity: 1 }],
    }).success).toBe(false);
  });
});
