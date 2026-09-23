import "server-only";
import type { PaymentProvider } from "@/lib/payments/provider";
import { StripePaymentProvider } from "@/lib/payments/providers/stripe";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "stripe";
  if (provider === "stripe") return new StripePaymentProvider();
  throw new Error(`UNSUPPORTED_PAYMENT_PROVIDER:${provider}`);
}
