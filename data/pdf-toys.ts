import type { Product } from "@/types/catalog";

type PdfToyRow = {
  sku: string;
  slug: string;
  nameDe: string;
  nameEn: string;
  color: string;
  size: string;
  price: number;
  image: string;
  source: string;
  bundle?: string[];
};

const CATEGORY_ID = "00000000-0000-4000-8000-000000000001";
const IMAGE_BASE = "https://laboni.design/media/image";
const SITE_BASE = "https://laboni.design";

// Prices, article numbers, colours and sizes are transcribed from the supplied
// LABONI UVP/RRP scans (printed pages 4-7). Product images are the matching
// full-resolution LABONI assets and were checked against the PDF illustrations.
const PDF_TOYS: PdfToyRow[] = [
  { sku: "10700", slug: "emma-ente", nameDe: "Emma Ente", nameEn: "Emma Duck", color: "Yellow", size: "16 cm", price: 14.95, image: "58Bq59XsBpGNYcz", source: "/spielen/182/emma-ente-kult-spielzeug-fuer-hunde" },
  { sku: "11300", slug: "franz-pferdinand", nameDe: "Franz Pferdinand", nameEn: "Franz Horse Ferdinand", color: "Brown", size: "23 cm", price: 16.95, image: "11300", source: "/spielen/186/franz-pferdinand-kult-spielzeug-fuer-hunde" },
  { sku: "12300", slug: "eddie-eichhorn", nameDe: "Eddie Eichhorn", nameEn: "Eddie Squirrel", color: "Brown", size: "24 cm", price: 14.95, image: "12300", source: "/spielen/187/eddie-eichhorn-kult-spielzeug-fuer-hunde" },
  { sku: "12804", slug: "diego-dackel", nameDe: "Diego Dackel", nameEn: "Diego Dachshund", color: "Brown", size: "24 cm", price: 14.95, image: "12804", source: "/spielen/666/diego-dackel-kult-spielzeug-fuer-hunde" },
  { sku: "10400", slug: "kater-casanova", nameDe: "Kater Casanova", nameEn: "Casanova Cat", color: "Black", size: "16 cm", price: 14.95, image: "10400", source: "/spielen/189/kater-casanova-kult-spielzeug-fuer-hunde" },
  { sku: "12100", slug: "heinrich-hase", nameDe: "Heinrich Hase", nameEn: "Heinrich Hare", color: "Brown", size: "21 cm", price: 14.95, image: "140VtpOvNZRbnnNC", source: "/spielen/188/heinrich-hase-kult-spielzeug-fuer-hunde" },
  { sku: "10900", slug: "franzi-flamingo", nameDe: "Franzi Flamingo", nameEn: "Franzi Flamingo", color: "Pink", size: "22 cm", price: 16.95, image: "67zaMqI9GPwPANQ", source: "/spielen/171/franzi-flamingo-kult-spielzeug-fuer-hunde" },
  { sku: "11400", slug: "kurt-kaenguru", nameDe: "Kurt Känguru", nameEn: "Kurt Kangaroo", color: "Teal", size: "22 cm", price: 16.95, image: "96BYhi1OxtW1mpT", source: "/spielen/176/kurt-kaenguru-kult-spielzeug-fuer-hunde" },
  { sku: "10810", slug: "elton-elefant", nameDe: "Elton Elefant", nameEn: "Elton Elephant", color: "Grey", size: "33 cm", price: 16.95, image: "10800-10810", source: "/spielen/169/elton-elefant-kult-spielzeug-fuer-hunde" },
  { sku: "10800", slug: "elton-elefant-jr", nameDe: "Elton Elefant Jr.", nameEn: "Elton Elephant Jr.", color: "Grey", size: "22 cm", price: 14.95, image: "10800-10810", source: "/spielen/169/elton-elefant-kult-spielzeug-fuer-hunde" },
  { sku: "11200", slug: "nina-nilpferd", nameDe: "Nina Nilpferd", nameEn: "Nina Hippo", color: "Grey", size: "23 cm", price: 16.95, image: "8717HFNIdkkZ7Al", source: "/spielen/167/nina-nilpferd-kult-spielzeug-fuer-hunde" },
  { sku: "12400", slug: "timothy-tiger", nameDe: "Timothy Tiger", nameEn: "Timothy Tiger", color: "Orange", size: "20 cm", price: 16.95, image: "155b1wfB92ET25ox", source: "/spielen/175/timothy-tiger-kult-spielzeug-fuer-hunde" },
  { sku: "11600", slug: "leo-loewe", nameDe: "Leo Löwe", nameEn: "Leo Lion", color: "Yellow", size: "15 cm", price: 14.95, image: "104qiJY0HcVimdjA", source: "/spielen/172/leo-loewe-kult-spielzeug-fuer-hunde" },
  { sku: "11000", slug: "gretchen-giraffe", nameDe: "Gretchen Giraffe", nameEn: "Gretchen Giraffe", color: "Yellow", size: "23 cm", price: 14.95, image: "74NJcdwIMjrzBCD", source: "/spielen/168/greta-giraffe-kult-spielzeug-fuer-hunde" },
  { sku: "11010", slug: "greta-giraffe", nameDe: "Greta Giraffe", nameEn: "Greta Giraffe", color: "Yellow", size: "40 cm", price: 16.95, image: "11010", source: "/spielen/168/greta-giraffe-kult-spielzeug-fuer-hunde" },
  { sku: "10100", slug: "kalli-krokodil", nameDe: "Kalli Krokodil", nameEn: "Kalli Crocodile", color: "Green", size: "32 cm", price: 16.95, image: "10100_1", source: "/spielen/173/kalli-krokodil-kult-spielzeug-fuer-hunde" },
  { sku: "12500", slug: "tina-turtle", nameDe: "Tina Turtle", nameEn: "Tina Turtle", color: "Green", size: "19 cm", price: 14.95, image: "12500", source: "/spielen/174/tina-turtle-kult-spielzeug-fuer-hunde" },
  { sku: "10500", slug: "kristof-krabbe", nameDe: "Kristof Krabbe", nameEn: "Kristof Crab", color: "Orange", size: "15 cm", price: 14.95, image: "4994GWn5y5OO2qa", source: "/spielen/179/kristof-krabbe-kult-spielzeug-fuer-hunde" },
  { sku: "11800", slug: "thaddaeus-tintenfisch", nameDe: "Thaddäus Tintenfisch", nameEn: "Thaddäus Octopus", color: "Orange", size: "14 cm", price: 14.95, image: "124Yoyl9wqkBTs44", source: "/spielen/180/thaddaeus-tintenfisch-kult-spielzeug-fuer-hunde" },
  { sku: "11700", slug: "hugo-hummer-jr", nameDe: "Hugo Hummer Jr.", nameEn: "Hugo Lobster Jr.", color: "Red", size: "17 cm", price: 14.95, image: "11700", source: "/spielen/170/hugo-hummer-kult-spielzeug-fuer-hunde" },
  { sku: "11710", slug: "hugo-hummer", nameDe: "Hugo Hummer", nameEn: "Hugo Lobster", color: "Red", size: "26 cm", price: 16.95, image: "11700_11710", source: "/spielen/170/hugo-hummer-kult-spielzeug-fuer-hunde" },
  { sku: "12000", slug: "poldi-pinguin", nameDe: "Poldi Pinguin", nameEn: "Poldi Penguin", color: "Black", size: "20 cm", price: 16.95, image: "137mG3nwhBruHhuk", source: "/spielen/177/poldi-pinguin-kult-spielzeug-fuer-hunde" },
  { sku: "10600", slug: "didi-delfin", nameDe: "Didi Delfin", nameEn: "Didi Dolphin", color: "Blue", size: "26 cm", price: 16.95, image: "544wGCZCUkMlTjF", source: "/spielen/181/didi-delfin-kult-spielzeug-fuer-hunde" },
  { sku: "10200", slug: "angela-anker", nameDe: "Angela Anker", nameEn: "Angela Anchor", color: "Teal", size: "18 × 17 cm", price: 12.95, image: "37VzlULtiuSOIZw", source: "/spielen/185/angela-anker-kult-spielzeug-fuer-hunde" },
  { sku: "11500", slug: "rita-rettungsring", nameDe: "Rita Rettungsring", nameEn: "Rita Lifebuoy", color: "White", size: "Ø 18 cm", price: 12.95, image: "100uqBzsCD6B1oxO", source: "/spielen/184/rita-rettungsring-kult-spielzeug-fuer-hunde" },
  { sku: "12600", slug: "skipper", nameDe: "Skipper", nameEn: "Skipper", color: "Blue", size: "Ø 21 cm", price: 14.95, image: "166RON2gFI1yq10I", source: "/spielen/183/skipper-kult-spielzeug-fuer-hunde" },
  { sku: "12802", slug: "britta-brezel", nameDe: "Britta Brezel", nameEn: "Britta Pretzel", color: "Brown", size: "24 × 23 cm", price: 14.95, image: "12812_1", source: "/spielen/659/mini-brezel-kult-spielzeug-fuer-hunde" },
  { sku: "12812", slug: "mini-brezel", nameDe: "Mini Brezel", nameEn: "Mini Pretzel", color: "Brown", size: "16 × 12 cm", price: 12.95, image: "12812_1", source: "/spielen/659/mini-brezel-kult-spielzeug-fuer-hunde" },
  { sku: "11100", slug: "hertha-heart", nameDe: "Hertha Heart", nameEn: "Hertha Heart", color: "Red", size: "15 cm", price: 12.95, image: "81tVmNR1Y1EZx5d", source: "/spielen/192/heart-kult-spielzeug-fuer-hunde" },
  { sku: "11110", slug: "mini-heart", nameDe: "Mini Heart", nameEn: "Mini Heart", color: "Red", size: "10 cm", price: 6.95, image: "11110_3b", source: "/spielen/192/heart-kult-spielzeug-fuer-hunde" },
  { sku: "11900", slug: "paula-peace", nameDe: "Paula Peace", nameEn: "Paula Peace", color: "Red", size: "Ø 17 cm", price: 12.95, image: "11900-01", source: "/spielen/190/paulchen-peace-kult-spielzeug-fuer-hunde" },
  { sku: "11901", slug: "paulchen-peace", nameDe: "Paulchen Peace", nameEn: "Paulchen Peace", color: "Blue", size: "Ø 17 cm", price: 12.95, image: "11900_11901", source: "/spielen/190/paulchen-peace-kult-spielzeug-fuer-hunde" },
  { sku: "10300", slug: "bonnie-bone-blue-white", nameDe: "Bonnie Bone Blau-Weiss", nameEn: "Bonnie Bone Blue-White", color: "Blue-White", size: "15 cm", price: 9.95, image: "10300", source: "/spielen/178/bonnie-bone-kult-spielzeug-fuer-hunde" },
  { sku: "10301", slug: "bonnie-bone-black-white", nameDe: "Bonnie Bone Schwarz-Weiss", nameEn: "Bonnie Bone Black-White", color: "Black-White", size: "15 cm", price: 9.95, image: "10301", source: "/spielen/178/bonnie-bone-kult-spielzeug-fuer-hunde" },
  { sku: "12200", slug: "ringo-ring", nameDe: "Ringo Ring", nameEn: "Ringo Ring", color: "Black", size: "Ø 21 cm", price: 8.95, image: "143ekzRswy9cBukN", source: "/spielen/191/ringo-ring-kult-spielzeug-fuer-hunde" },
  { sku: "12721", slug: "mega-schleuderball", nameDe: "Mega Schleuderball", nameEn: "Mega Sling Ball", color: "Black-Green-Grey", size: "Ø 11 cm", price: 9.95, image: "12721gBq7bF8OGCsUO", source: "/spielen/193/mega-schleuderball-kult-spielzeug-fuer-hunde" },
  { sku: "12702", slug: "mini-schleuderball-blue", nameDe: "Mini Schleuderball Blau", nameEn: "Mini Sling Ball Blue", color: "Blue", size: "Ø 6 cm", price: 6.95, image: "12702_1", source: "/spielen/215/mini-schleuderball-kult-spielzeug-fuer-hunde" },
  { sku: "12711", slug: "maxi-schleuderball-blue", nameDe: "Maxi Schleuderball Blau", nameEn: "Maxi Sling Ball Blue", color: "Blue", size: "Ø 9 cm", price: 8.95, image: "12711Vg6OXnu1l8Qsv", source: "/spielen/214/maxi-schleuderball-kult-spielzeug-fuer-hunde" },
  { sku: "12712", slug: "maxi-schleuderball-pink", nameDe: "Maxi Schleuderball Pink", nameEn: "Maxi Sling Ball Pink", color: "Pink", size: "Ø 9 cm", price: 8.95, image: "12701UQlM3lcO1qGEJ", source: "/spielen/214/maxi-schleuderball-kult-spielzeug-fuer-hunde" },
  { sku: "12701", slug: "mini-schleuderball-pink", nameDe: "Mini Schleuderball Pink", nameEn: "Mini Sling Ball Pink", color: "Pink", size: "Ø 6 cm", price: 6.95, image: "12701UQlM3lcO1qGEJ", source: "/spielen/215/mini-schleuderball-kult-spielzeug-fuer-hunde" },
  { sku: "12805", slug: "doggy-dog-jr", nameDe: "Doggy Dog Jr.", nameEn: "Doggy Dog Jr.", color: "Beige", size: "20 cm", price: 12.95, image: "12805_1b", source: "/spielen/686/doggy-dog-kult-spielzeug-fuer-hunde" },
  { sku: "12815", slug: "doggy-dog", nameDe: "Doggy Dog", nameEn: "Doggy Dog", color: "Beige", size: "34 cm", price: 14.95, image: "12815_1", source: "/spielen/686/doggy-dog-kult-spielzeug-fuer-hunde" },
  { sku: "12806", slug: "tapsi", nameDe: "Tapsi", nameEn: "Tapsi", color: "Natural", size: "12.5 cm", price: 12.95, image: "12806", source: "/spielen/687/tapsi-kult-spielzeug-fuer-hunde" },
  { sku: "12807", slug: "richie-retriever", nameDe: "Richie Retriever", nameEn: "Richie Retriever", color: "Natural", size: "23 cm", price: 14.95, image: "12807", source: "/spielen/688/richie-retriever-kult-spielzeug-fuer-hunde" },
  { sku: "12801", slug: "rudi-rentier", nameDe: "Rudi Rentier", nameEn: "Rudi Reindeer", color: "Brown", size: "15 cm", price: 12.95, image: "12801", source: "/spielen/657/rudi-rentier-kult-spielzeug-fuer-hunde" },
  { sku: "12803", slug: "shawn-der-schneemann", nameDe: "Shawn der Schneemann", nameEn: "Shawn the Snowman", color: "White", size: "18 cm", price: 12.95, image: "12803", source: "/spielen/658/shawn-der-schneemann-kult-spielzeug-fuer-hunde" },
  { sku: "13002", slug: "ahoy-laboni", nameDe: "Ahoy LABONI", nameEn: "Ahoy LABONI", color: "Mixed", size: "3-piece set", price: 36.95, image: "13002-Ahoy-LABONIRFKAOrQywMQrw", source: "/spielen/503/ahoy-laboni-spielzeug-set-fuer-hunde", bundle: ["10200", "11500", "12600"] },
  { sku: "13006", slug: "little-ocean", nameDe: "Little Ocean", nameEn: "Little Ocean", color: "Mixed", size: "3-piece set", price: 39.95, image: "13006-Little-Ocean", source: "/spielen/500/little-ocean-spielzeug-set-fuer-hunde", bundle: ["11700", "11800", "12500"] },
  { sku: "13000", slug: "big-ocean", nameDe: "Big Ocean", nameEn: "Big Ocean", color: "Mixed", size: "3-piece set", price: 44.95, image: "13000", source: "/spielen/499/big-ocean-spielzeug-set-fuer-hunde", bundle: ["10600", "11710", "12000"] },
  { sku: "13003", slug: "laboni-farm", nameDe: "LABONI Farm", nameEn: "LABONI Farm", color: "Mixed", size: "3-piece set", price: 39.95, image: "13003-Farm", source: "/spielen/507/laboni-farm-spielzeug-set-fuer-hunde", bundle: ["10400", "10700", "12300"] },
  { sku: "13007", slug: "wild-life", nameDe: "Wild Life", nameEn: "Wild Life", color: "Mixed", size: "3-piece set", price: 44.95, image: "13007-Wild-Life", source: "/spielen/502/wild-life-spielzeug-set-fuer-hunde", bundle: ["10100", "10810", "11010"] },
  { sku: "13004", slug: "summer-safari", nameDe: "Summer Safari", nameEn: "Summer Safari", color: "Mixed", size: "3-piece set", price: 39.95, image: "13004-SafarilLZ91h99dN2tI", source: "/spielen/501/summer-safari-spielzeug-set-fuer-hunde", bundle: ["10800", "11000", "10900"] },
  { sku: "13014", slug: "bavarian-dreams", nameDe: "Bavarian Dreams", nameEn: "Bavarian Dreams", color: "Mixed", size: "4-piece set", price: 44.95, image: "13014", source: "/spielen/671/bavarian-dreams-spielzeug-set-fuer-hunde", bundle: ["11100", "10300", "12812", "12804"] },
  { sku: "13015", slug: "winter-fun", nameDe: "Winter Fun", nameEn: "Winter Fun", color: "Mixed", size: "3-piece set", price: 39.95, image: "13015", source: "/spielen/", bundle: ["12803", "12000", "12801"] },
];

function stableUuid(prefix: "31" | "32", index: number) {
  return `${prefix}000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

export const pdfToyProducts: Product[] = PDF_TOYS.map((row, index) => {
  const isBundle = Boolean(row.bundle?.length);
  const variantOptions: Record<string, string> = isBundle
    ? { configuration: row.size }
    : { color: row.color, size: row.size };
  const descriptionDe = isBundle
    ? `${row.nameDe} kombiniert ${row.bundle!.length} handgeknüpfte LABONI Baumwollspielzeuge für abwechslungsreiche Kau-, Wurf- und Apportierspiele.`
    : `${row.nameDe} ist ein handgeknüpftes LABONI Hundespielzeug aus reiner Baumwolle für Kau-, Wurf- und Apportierspiele.`;
  const descriptionEn = isBundle
    ? `${row.nameEn} combines ${row.bundle!.length} hand-knotted LABONI cotton toys for varied chewing, throwing and retrieving games.`
    : `${row.nameEn} is a hand-knotted LABONI dog toy made from pure cotton for chewing, throwing and retrieving games.`;

  return {
    id: stableUuid("31", index),
    categoryId: CATEGORY_ID,
    categorySlug: "spielen",
    slug: row.slug,
    name: { de: row.nameDe, en: row.nameEn },
    shortDescription: {
      de: isBundle ? "LABONI Spielzeug-Set aus handgeknüpfter Baumwolle" : "Handgeknüpftes Baumwollspielzeug für Hunde",
      en: isBundle ? "LABONI toy set made from hand-knotted cotton" : "Hand-knotted cotton dog toy",
    },
    description: { de: descriptionDe, en: descriptionEn },
    productType: isBundle ? "bundle" : "simple",
    basePrice: row.price,
    currency: "CHF",
    featured: index < 8,
    active: true,
    sourceUrl: `${SITE_BASE}${row.source}`,
    attributes: {
      material: "100% cotton",
      size: row.size,
      color: row.color,
    },
    images: [{
      id: `pdf-toy-${row.sku}`,
      url: `${IMAGE_BASE}/${row.image}.jpg`,
      alt: { de: `${row.nameDe} von LABONI`, en: `${row.nameEn} by LABONI` },
      sortOrder: 0,
    }],
    variants: [{
      id: stableUuid("32", index),
      sku: row.sku,
      articleNumber: row.sku,
      price: row.price,
      currency: "CHF",
      stockQuantity: 0,
      active: true,
      options: variantOptions,
    }],
    bundleItems: row.bundle?.map((childSku) => ({ childSku, quantity: 1 })),
  };
});
