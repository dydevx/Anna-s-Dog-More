import type { Locale } from "@/types/catalog";

export const STORE = {
  name: "Anna's Dog & More",
  street: "Leimbachstrasse 200",
  postalCode: "8041",
  city: "Zürich",
  country: "Switzerland",
  countryCode: "CH",
} as const;

export const OPENING_HOURS = [
  { day: { de: "Montag", en: "Monday" }, hours: "09:00-18:00" },
  { day: { de: "Dienstag", en: "Tuesday" }, hours: "09:00-18:00" },
  { day: { de: "Mittwoch", en: "Wednesday" }, hours: "09:00-18:00" },
  { day: { de: "Donnerstag", en: "Thursday" }, hours: "09:00-18:00" },
  { day: { de: "Freitag", en: "Friday" }, hours: "09:00-18:00" },
  { day: { de: "Samstag", en: "Saturday" }, hours: "09:00-15:00" },
  { day: { de: "Sonntag", en: "Sunday" }, hours: { de: "Geschlossen", en: "Closed" } },
] as const;

export function localizeHours(hours: (typeof OPENING_HOURS)[number]["hours"], locale: Locale) {
  return typeof hours === "string" ? hours : hours[locale];
}

export const SCHEMA_OPENING_HOURS = [
  "Mo 09:00-18:00",
  "Tu 09:00-18:00",
  "We 09:00-18:00",
  "Th 09:00-18:00",
  "Fr 09:00-18:00",
  "Sa 09:00-15:00",
];
