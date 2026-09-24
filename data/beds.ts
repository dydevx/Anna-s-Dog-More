import type { Product } from "@/types/catalog";

type BedSeed = {
  slug: string;
  name: string;
  price: number;
  sku: string;
  sourceUrl: string;
  fabric: string;
  colors: string[];
  images: string[];
  family: "classic" | "prado" | "vogue" | "luna";
  sale?: boolean;
};

const CATEGORY_ID = "00000000-0000-4000-8000-000000000007";

const beds: BedSeed[] = [
  { slug: "classic-hundebett-teddy", name: "CLASSIC Hundebett - TEDDY", price: 159.9, sku: "4101S-505", sourceUrl: "https://laboni.design/hundebetten/betten/583/classic-hundebett-teddy", fabric: "Teddy", colors: ["Grey", "Green", "Creme"], family: "classic", images: ["LABONI_Polsterbett_Teddy_beige_L_24.jpg", "4102S-505.jpg", "4102S-505_1.jpg", "LABONI_Polsterbett_Teddy_beige_L_22.jpg"] },
  { slug: "classic-hundebett-glam", name: "CLASSIC Hundebett - GLAM", price: 159.9, sku: "4101S-809", sourceUrl: "https://laboni.design/hundebetten/betten/588/classic-hundebett-glam", fabric: "Glam", colors: ["Rose", "Graphite"], family: "classic", images: ["4102S-804_2r5oujSYFaaG74.jpg", "4102S-804.jpg", "4102S-804_1.jpg", "4102S-804_10.jpg"] },
  { slug: "classic-hundebett-oxford", name: "CLASSIC Hundebett - OXFORD", price: 159.9, sku: "4101S-200", sourceUrl: "https://laboni.design/hundebetten/betten/490/classic-hundebett-oxford", fabric: "Oxford", colors: ["Taupe", "Olive", "Stone"], family: "classic", images: ["4101S-200_3.jpg", "4101S-200_1.jpg", "4101S-200.jpg", "4101S-200_4.jpg"] },
  { slug: "classic-hundebett-smooth", name: "CLASSIC Hundebett - SMOOTH", price: 169.9, sku: "4101S-106", sourceUrl: "https://laboni.design/hundebetten/betten/489/classic-hundebett-smooth", fabric: "Smooth", colors: ["Lino", "Black Silk"], family: "classic", images: ["4101S-106_5.jpg", "4103S-106_1.jpg", "4102B-106.jpg", "4101S-106_3.jpg"] },
  { slug: "classic-hundebett-nova", name: "CLASSIC Hundebett - NOVA", price: 159.9, sku: "4101S-905", sourceUrl: "https://laboni.design/hundebetten/betten/589/classic-hundebett-nova", fabric: "Nova", colors: ["Stone", "Creme"], family: "classic", images: ["4102S-905_1WaZORPc8StJcR.jpg", "4102S-905_2ziN0GSwL6Tbee.jpg", "4102S-905_2b.jpg", "4102S-905.jpg"] },
  { slug: "classic-hundebett-scala", name: "CLASSIC Hundebett - SCALA", price: 79.94, sku: "4101S-702", sourceUrl: "https://laboni.design/sale/586/classic-hundebett-scala", fabric: "Scala", colors: ["Amber", "Denim"], family: "classic", sale: true, images: ["4102S-702.jpg", "4102S-702_1.jpg", "4102S-702_202iWR2C0ApxGN.jpg", "4102S-712_x.jpg"] },
  { slug: "classic-hundebett-tudor", name: "CLASSIC Hundebett - TUDOR", price: 129.9, sku: "4101S-300", sourceUrl: "https://laboni.design/hundebetten/betten/491/classic-hundebett-tudor", fabric: "Tudor", colors: ["Anthrazit", "Taupe", "Rose", "Olive", "Gold", "Grey"], family: "classic", images: ["4101S-300_1.jpg", "4103B-300.jpg", "4101S-300_2.jpg", "4101S-300_6.jpg"] },
  { slug: "prado-design-hundebett-chic", name: "PRADO - Design-Hundebett CHIC", price: 649.9, sku: "40410-103", sourceUrl: "https://laboni.design/lookbook/tropical/269/prado-design-hundebett-chic", fabric: "Chic", colors: ["Fango", "Grigio"], family: "prado", images: ["40410-103_6.jpg", "40410-103.jpg", "40410-103_1.jpg", "40410-103_2.jpg"] },
  { slug: "prado-design-hundebett-tudor", name: "PRADO - Design-Hundebett TUDOR", price: 599.9, sku: "40410-303", sourceUrl: "https://laboni.design/lookbook/tropical/445/prado-design-hundebett-tudor", fabric: "Tudor", colors: ["Anthrazit", "Rose", "Olive", "Gold", "Grey"], family: "prado", images: ["40410-303_3.jpg", "83B303_3.jpg", "40410-303_1.jpg", "40410-303_5.jpg"] },
  { slug: "prado-design-hundebett-oxford", name: "PRADO - Design-Hundebett OXFORD", price: 629.9, sku: "40410-203", sourceUrl: "https://laboni.design/hundebetten/betten/286/prado-design-hundebett-oxford", fabric: "Oxford", colors: ["Rose", "Olive", "Stone", "Grey"], family: "prado", images: ["40410-204.jpg", "40410-203.jpg", "40410-203_1mCpNArcHfff5E.jpg", "83203S_1.jpg"] },
  { slug: "prado-design-hundebett-smooth", name: "PRADO - Design-Hundebett SMOOTH", price: 649.9, sku: "40410-106", sourceUrl: "https://laboni.design/hundebetten/betten/482/prado-design-hundebett-smooth", fabric: "Smooth", colors: ["Lino", "Black Silk"], family: "prado", images: ["40410_Mood.jpg", "40410-106.jpg", "901S106_1.jpg", "LABONI_08_2022_Australian_Shephard_Amy_115.jpg"] },
  { slug: "vogue-design-hundebett-chic", name: "VOGUE - Design-Hundebett CHIC", price: 649.9, sku: "40414-102", sourceUrl: "https://laboni.design/hundebetten/betten/270/vogue-design-hundebett-chic", fabric: "Chic", colors: ["Fango", "Grigio"], family: "vogue", images: ["901S102_2.jpg", "40414-102.jpg", "40414-102_1.jpg", "901B102_3.jpg"] },
  { slug: "vogue-design-hundebett-smooth", name: "VOGUE - Design-Hundebett SMOOTH", price: 649.9, sku: "40414-106", sourceUrl: "https://laboni.design/lookbook/tropical/483/vogue-design-hundebett-smooth", fabric: "Smooth", colors: ["Lino", "Black Silk"], family: "vogue", images: ["LABONI_08_2022_Australian_Shephard_Amy_406.jpg", "40414-106CgsmA5y32xcZc.jpg", "40414-106_1AYX7n18DezMcm.jpg", "40414-106.jpg"] },
  { slug: "vogue-design-hundebett-oxford", name: "VOGUE - Design-Hundebett OXFORD", price: 629.9, sku: "40414-202", sourceUrl: "https://laboni.design/hundebetten/betten/282/vogue-design-hundebett-oxford", fabric: "Oxford", colors: ["Taupe", "Rose", "Olive", "Stone", "Grey"], family: "vogue", images: ["901S202_2.jpg", "LABONI_Bett_Vogue_stone_01.jpg", "40414-202_1pkOG9oSljBDL6.jpg", "83202_1.jpg"] },
  { slug: "vogue-design-hundebett-tudor", name: "VOGUE - Design-Hundebett TUDOR", price: 599.9, sku: "40414-303", sourceUrl: "https://laboni.design/hundebetten/betten/458/vogue-design-hundebett-tudor", fabric: "Tudor", colors: ["Anthrazit", "Taupe", "Rose", "Olive", "Gold", "Grey"], family: "vogue", images: ["83B303_2.jpg", "40414-300.jpg", "83B307_2.jpg", "40414-307_1.jpg"] },
  { slug: "luna-lounge-set-tudor", name: "LUNA LOUNGE SET - TUDOR", price: 99.9, sku: "83S304", sourceUrl: "https://laboni.design/hundebetten/hundekissen/462/luna-lounge-set-tudor", fabric: "Tudor", colors: ["Anthrazit", "Rose", "Olive", "Gold", "Grey"], family: "luna", images: ["83S304_2.jpg", "83B304_1.jpg", "83B304.jpg", "40410-304_9.jpg"] },
  { slug: "luna-lounge-set-oxford", name: "LUNA LOUNGE SET - OXFORD", price: 129.9, sku: "83S200", sourceUrl: "https://laboni.design/hundebetten/hundekissen/461/luna-lounge-set-oxford", fabric: "Oxford", colors: ["Rose", "Olive", "Stone", "Grey"], family: "luna", images: ["83200S_8.jpg", "83200S_1.jpg", "83200.jpg", "83200S_14.jpg"] },
  { slug: "luna-lounge-set-smooth", name: "LUNA LOUNGE SET - SMOOTH", price: 149.9, sku: "83S105", sourceUrl: "https://laboni.design/hundebetten/hundekissen/486/luna-lounge-set-smooth", fabric: "Smooth", colors: ["Lino", "Black Silk"], family: "luna", images: ["83105S_1.jpg", "83105SSarQTBVpU3aOE.jpg", "83105S.jpg", "Laboni_Smooth_Lino.jpg"] },
];

const imageUrl = (file: string) => `https://laboni.design/media/image/${file}`;
const stableUuid = (prefix: "41" | "42", index: number) => `${prefix}000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

export const bedProducts: Product[] = beds.map((bed, index) => {
  const classic = bed.family === "classic";
  const lounge = bed.family === "luna";
  const familyLabel = bed.family.toUpperCase();
  const shortDe = lounge
    ? `Bodennahes Lounge-Kissen mit ${bed.fabric} Bezug`
    : classic
      ? `Komfortables Polsterbett mit ${bed.fabric} Bezug`
      : `Design-Hundebett der ${familyLabel} Kollektion`;
  const shortEn = lounge
    ? `Low lounge cushion with ${bed.fabric} cover`
    : classic
      ? `Comfortable upholstered bed with ${bed.fabric} cover`
      : `Designer dog bed from the ${familyLabel} collection`;
  const descriptionDe = lounge
    ? `Das LUNA LOUNGE SET kombiniert ein grosszügiges Hundekissen mit einem abnehmbaren ${bed.fabric} Bezug. Die bodennahe Form eignet sich als eigenständiger Ruheplatz oder als Ergänzung zu ausgewählten Bettgestellen.`
    : classic
      ? `Das CLASSIC Hundebett verbindet eine formstabile Komfortfüllung mit einem abnehmbaren ${bed.fabric} Möbelstoff. Bezüge und Matratzen lassen sich austauschen; ein Upgrade auf die OrthoMattress ist möglich.`
      : `Das ${familyLabel} Design-Hundebett verbindet ein handwerklich gefertigtes Bettgestell mit einem komfortablen Kissen im ${bed.fabric} Stoff. Gestaltung, Material und Funktion sind für den täglichen Einsatz mit Hund abgestimmt.`;
  const descriptionEn = lounge
    ? `The LUNA LOUNGE SET combines a generous dog cushion with a removable ${bed.fabric} cover. Its low profile works as a standalone resting place or with selected bed frames.`
    : classic
      ? `The CLASSIC dog bed pairs shape-retaining comfort filling with a removable ${bed.fabric} upholstery cover. Covers and mattresses can be replaced, with an OrthoMattress upgrade available.`
      : `The ${familyLabel} designer dog bed combines a crafted bed frame with a comfortable cushion in ${bed.fabric} fabric. Form, material and function are made for everyday life with a dog.`;

  const sizes = classic ? ["S", "M", "L"] : [lounge ? "One size" : "M"];
  return {
    id: index === 0 ? "10000000-0000-4000-8000-000000000006" : stableUuid("41", index),
    categoryId: CATEGORY_ID,
    categorySlug: "polsterbetten",
    slug: bed.slug,
    name: { de: bed.name, en: bed.name.replace("Hundebett", "Dog Bed") },
    shortDescription: { de: shortDe, en: shortEn },
    description: { de: descriptionDe, en: descriptionEn },
    productType: "configurable",
    basePrice: bed.price,
    currency: "CHF",
    featured: index < 4,
    active: true,
    badge: bed.sale ? "sale" : index === 4 ? "new" : undefined,
    sourceUrl: bed.sourceUrl,
    attributes: {
      material: bed.fabric,
      color: bed.colors.join(", "),
      size: classic ? "S: 68 x 55 x 20 cm; M: 85 x 66 x 22 cm; L: 112 x 95 x 25 cm" : sizes[0],
      mattress: classic ? "Classic; OrthoMattress compatible" : "Comfort cushion",
      care: classic ? "Removable cover, machine washable at 40°C" : "Removable cover",
    },
    images: bed.images.map((file, imageIndex) => ({
      id: `bed-${index + 1}-${imageIndex + 1}`,
      url: imageUrl(file),
      alt: {
        de: `${bed.name} in einer Wohnumgebung`,
        en: `${bed.name.replace("Hundebett", "dog bed")} in a home interior`,
      },
      sortOrder: imageIndex,
    })),
    variants: [{
      id: index === 0 ? "20000000-0000-4000-8000-000000000007" : stableUuid("42", index),
      sku: bed.sku,
      articleNumber: bed.sku,
      price: bed.price,
      currency: "CHF",
      stockQuantity: 0,
      active: true,
      options: { size: sizes[0], color: bed.colors[0], fabric: bed.fabric, mattress: classic ? "Classic" : "Comfort" },
    }],
  };
});
