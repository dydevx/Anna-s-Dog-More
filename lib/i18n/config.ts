import type { Locale } from "@/types/catalog";

export const locales: Locale[] = ["de", "en"];
export const defaultLocale: Locale = "de";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
