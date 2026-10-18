import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
  name: "stripe", getPayment: vi.fn(), assertConfigured: vi.fn(), createPayment: vi.fn(), expirePayment: vi.fn(), verifyWebhook: vi.fn(), rateLimit: vi.fn(),
  sendOrderConfirmation: vi.fn(), sendShopNotification: vi.fn(),
  emailProvider: null as null | { sendOrderConfirmation: ReturnType<typeof vi.fn>; sendShopNotification: ReturnType<typeof vi.fn> },
  bankDetails: null as null | { accountHolder: string; iban: string; bic?: string },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc, from: () => ({ select: mocks.select }) }) }));
vi.mock("@/lib/supabase/server", () => ({ createUserClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
vi.mock("@/lib/payments", () => ({ getPaymentProvider: () => mocks }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit, requestIp: () => "test" }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/email/provider", () => ({ getEmailProvider: () => mocks.emailProvider, getBankTransferDetails: () => mocks.bankDetails }));
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { GET as status } from "@/app/api/checkout/status/route";

const id = "20000000-0000-4000-8000-000000000001";
const address = { firstName: "Anna", lastName: "Test", street: "Street", houseNumber: "1", postalCode: "8000", city: "Zurich", country: "CH" };
function checkoutRequest(origin = "https://shop.example.ch") {
  return new Request("https://shop.example.ch/api/checkout", { method: "POST", headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "en", email: "buyer@example.ch", shippingAddress: address, billingAddress: address,
      shippingMethodId: id, items: [{ variantId: id, quantity: 1 }] }),
  });
}
function webhookRequest() { return new Request("https://shop.example.ch/api/webhooks/stripe", { method: "POST", headers: { "stripe-signature": "signed" }, body: "{}" }); }

describe("payment routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PAYMENT_PROVIDER = "stripe";
    mocks.emailProvider = null;
    mocks.bankDetails = null;
    mocks.rateLimit.mockResolvedValue(true);
    mocks.select.mockImplementation((columns: string) => columns === "provider_payment_id"
      ? { eq: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) } : { eq: mocks.eq });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.eq.mockResolvedValue({ data: [{ product_name: "Test", variant_description: "", sku: "TEST", unit_price: 10, quantity: 1, line_total: 10 }], error: null });
    mocks.rpc.mockImplementation(async (name: string) => name === "create_checkout_order"
      ? { data: [{ order_id: id, public_token: id, order_number: "AD-TEST", grand_total: 15, currency: "CHF", payment_expires_at: 2000000000 }], error: null }
      : { data: true, error: null });
    mocks.createPayment.mockResolvedValue({ provider: "stripe", providerPaymentId: "cs_test", redirectUrl: "https://checkout.stripe.com/test", expiresAt: 2000000000 });
    mocks.verifyWebhook.mockResolvedValue({ outcome: "paid", paid: true, eventId: "evt_test", orderId: id, providerPaymentId: "cs_test", method: "unknown", amount: 15, currency: "CHF", eventType: "checkout.session.completed", payloadHash: "hash" });
  });
  it("rejects a foreign checkout origin before any mutation", async () => {
    expect((await checkout(checkoutRequest("https://foreign.example"))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not create an order when Stripe is not configured", async () => {
    mocks.assertConfigured.mockImplementation(() => { throw new Error("STRIPE_NOT_CONFIGURED"); });
    expect((await checkout(checkoutRequest())).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("registers the session before returning its redirect", async () => {
    const response = await checkout(checkoutRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ token: id, redirectUrl: "https://checkout.stripe.com/test" });
    expect(mocks.rpc).toHaveBeenCalledWith("register_payment_session", expect.objectContaining({ p_order_id: id, p_provider_payment_id: "cs_test" }));
  });
  it("expires a payable session before releasing stock on registration failure", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "create_checkout_order"
      ? { data: [{ order_id: id, public_token: id, order_number: "AD-TEST", grand_total: 15, currency: "CHF" }], error: null }
      : name === "register_payment_session" ? { error: new Error("DB_FAILURE") } : { error: null });
    expect((await checkout(checkoutRequest())).status).toBe(409);
    expect(mocks.expirePayment).toHaveBeenCalledWith("cs_test");
    expect(mocks.rpc).toHaveBeenCalledWith("release_unpaid_order", { p_order_id: id });
    expect(mocks.expirePayment.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[2]);
  });
  it("preserves a hold when payment creation has an ambiguous network failure", async () => {
    mocks.createPayment.mockRejectedValue(new Error("NETWORK_TIMEOUT"));
    await checkout(checkoutRequest());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.expirePayment).not.toHaveBeenCalled();
  });
  it("reuses an existing payable session after a checkout retry", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { provider_payment_id: "cs_existing" }, error: null });
    mocks.getPayment.mockResolvedValue({ status: "unpaid", redirectUrl: "https://checkout.stripe.com/existing" });
    const response = await checkout(checkoutRequest());
    expect(await response.json()).toMatchObject({ redirectUrl: "https://checkout.stripe.com/existing" });
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("creates a bank-transfer order and emails the confirmation before redirecting", async () => {
    process.env.PAYMENT_PROVIDER = "bank_transfer";
    mocks.bankDetails = { accountHolder: "Anna's Dog & More", iban: "CH00 0000 0000 0000 0000 0" };
    mocks.emailProvider = { sendOrderConfirmation: mocks.sendOrderConfirmation, sendShopNotification: mocks.sendShopNotification };
    const response = await checkout(checkoutRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ token: id, redirectUrl: `/en/checkout/confirmation?token=${id}` });
    expect(mocks.createPayment).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("apply_payment_event", expect.objectContaining({ p_provider: "bank_transfer", p_outcome: "pending" }));
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: "AD-TEST", paymentStatus: "awaiting_bank_transfer" }));
    expect(mocks.sendShopNotification).toHaveBeenCalled();
  });
  it("returns a retryable error for a verified webhook database failure", async () => {
    mocks.rpc.mockResolvedValue({ error: new Error("DB_FAILURE") });
    expect((await webhook(webhookRequest())).status).toBe(500);
  });
  it("rejects an invalid signature without database access", async () => {
    mocks.verifyWebhook.mockRejectedValue(Object.assign(new Error("bad signature"), { name: "StripeSignatureVerificationError" }));
    expect((await webhook(webhookRequest())).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("applies failed payment events without claiming success", async () => {
    mocks.verifyWebhook.mockResolvedValue({ outcome: "failed", eventId: "evt_failed", orderId: id });
    expect((await webhook(webhookRequest())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("apply_payment_event", expect.objectContaining({ p_outcome: "failed" }));
  });
  it("validates status tokens before database lookup", async () => {
    expect((await status(new Request("https://shop.example.ch/api/checkout/status?token=invalid"))).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("returns only order summary fields and disables status caching", async () => {
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: { order_number: "AD-TEST", payment_status: "paid", grand_total: 15, currency: "CHF" }, error: null });
    const response = await status(new Request(`https://shop.example.ch/api/checkout/status?token=${id}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.select).toHaveBeenCalledWith("order_number,payment_status,grand_total,currency");
  });
});
