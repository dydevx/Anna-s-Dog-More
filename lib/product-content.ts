import type { Locale, Product } from "@/types/catalog";

const TOY_CATEGORY = "spielen";

const safetyNotice = {
  de: "Hund beim Spielen beaufsichtigen. Spielzeug regelmässig auf Beschädigungen kontrollieren und bei Beschädigung oder losen Teilen nicht weiterverwenden.",
  en: "Supervise your dog during play. Check the toy regularly for damage and stop using it if it is damaged or has loose parts.",
} as const;

const germanColors: Record<string, string> = {
  beige: "Beige",
  black: "Schwarz",
  "black-green-grey": "Schwarz/Grün/Grau",
  "black-white": "Schwarz/Weiss",
  blue: "Blau",
  "blue-white": "Blau/Weiss",
  brown: "Braun",
  green: "Grün",
  grey: "Grau",
  mixed: "Verschiedene Farben",
  natural: "Natur",
  orange: "Orange",
  pink: "Rosa",
  red: "Rot",
  teal: "Petrol",
  white: "Weiss",
  yellow: "Gelb",
};

function cleanProductName(name: string) {
  return name
    .replace(/\s+-\s+Kult-Spielzeug für Hunde$/i, "")
    .replace(/\s+-\s+Spielzeug-Set für Hunde$/i, "")
    .replace(/\s+-\s+cult toy for dogs$/i, "")
    .replace(/\s+-\s+toy set for dogs$/i, "");
}

function isToy(product: Product) {
  return product.categorySlug === TOY_CATEGORY;
}

function isToySet(product: Product) {
  return product.productType === "bundle"
    || product.name.de.toLocaleLowerCase("de").includes("spielzeug-set")
    || product.name.en.toLocaleLowerCase("en").includes("toy set");
}

export function getProductDescription(product: Product, locale: Locale) {
  if (!isToy(product)) return product.description[locale];

  const name = cleanProductName(product.name[locale]);
  if (isToySet(product)) {
    return locale === "de"
      ? `${name} ist ein liebevoll zusammengestelltes Set aus Hundespielzeugen aus Baumwolltau. Die Spielzeuge eignen sich zum gemeinsamen Spielen, Kauen und Apportieren. Ihre strukturierten Oberflächen können beim Kauen die mechanische Zahnreinigung unterstützen.`
      : `${name} is a thoughtfully assembled set of cotton-rope dog toys. The toys are suitable for interactive play, chewing and retrieving. Their textured surfaces can help support mechanical tooth cleaning during chewing.`;
  }

  return locale === "de"
    ? `${name} ist ein liebevoll gestaltetes Hundespielzeug aus Baumwolltau. Es eignet sich zum Spielen, Kauen und Apportieren. Die strukturierte Oberfläche kann beim Kauen die mechanische Zahnreinigung unterstützen.`
    : `${name} is a thoughtfully designed cotton-rope dog toy. It is suitable for playing, chewing and retrieving. The textured surface can help support mechanical tooth cleaning during chewing.`;
}

export function getProductSafetyNotice(product: Product, locale: Locale) {
  return isToy(product) ? safetyNotice[locale] : null;
}

function localizeToyValue(key: string, value: string, locale: Locale) {
  if (key === "material" && /cotton/i.test(value)) return locale === "de" ? "Baumwolle" : "Cotton";
  if (key === "color" && locale === "de") return germanColors[value.toLocaleLowerCase("en")] ?? value;
  if ((key === "size" || key === "configuration") && locale === "de") {
    return value
      .replace(/3-piece set/gi, "3-teiliges Set")
      .replace(/4-piece set/gi, "4-teiliges Set");
  }
  return value;
}

export function getProductDetailEntries(product: Product, locale: Locale) {
  const entries = Object.entries(product.attributes)
    .filter(([key]) => key !== "source")
    .map(([key, value]) => [key, isToy(product) ? localizeToyValue(key, value, locale) : value] as const);

  if (!isToy(product)) return entries;
  return [
    ...entries,
    ["brand", "LABONI"] as const,
    ["suitable", locale === "de" ? "Spielen und Apportieren" : "Play and retrieving"] as const,
  ];
}
