export type SupportedPaymentMethod = "card" | "twint";

export function paymentMethodsForCurrency(currency: string): SupportedPaymentMethod[] {
  return currency.toUpperCase() === "CHF" ? ["card", "twint"] : ["card"];
}
