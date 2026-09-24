import type { Locale } from "@/types/catalog";

export function formatMoney(amount: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-CH", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function toMinorUnits(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}
