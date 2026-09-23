import type { Locale } from "@/types/catalog";

export function formatMoney(amount: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", {
    style: "currency",
    currency,
  }).format(amount);
}

export function toMinorUnits(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}
