import { createClient } from "@supabase/supabase-js";

type SourceOption = { id: string; title: string };
type SourceGroup = { id: string; key: string; label: string; options: SourceOption[] };
type SourceProduct = { sourceUrl: string; name: string; sku: string; price: number | null; compareAtPrice: number | null; images: string[]; groups: SourceGroup[] };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const listingPages = ["https://laboni.design/hundebetten/", "https://laboni.design/hundebetten/?p=2", "https://laboni.design/hundebetten/?p=3"];

const categorySeeds = [
  { id: "00000000-0000-4000-8000-000000000009", slug: "orthopaedische-hundebetten", name_de: "Orthopädische Hundebetten", name_en: "Orthopaedic Dog Beds", description_de: "Orthopädische Schlafplätze und druckentlastende Matratzen.", description_en: "Orthopaedic sleeping solutions and pressure-relieving mattresses.", image_url: "https://laboni.design/media/image/4102SX-505.jpg", sort_order: 8, active: true },
  { id: "00000000-0000-4000-8000-000000000010", slug: "hundebett-zubehoer", name_de: "Hundebett-Zubehör", name_en: "Dog Bed Accessories", description_de: "Wechselbezüge, Inletts, Matratzen und Bettgestelle.", description_en: "Replacement covers, inserts, mattresses and bed frames.", image_url: "https://laboni.design/media/image/4102B-505.jpg", sort_order: 9, active: true },
  { id: "00000000-0000-4000-8000-000000000011", slug: "hundekissen", name_de: "Hundekissen", name_en: "Dog Cushions", description_de: "Bodennahe Lounge-Kissen und textile Schlafplätze.", description_en: "Low lounge cushions and textile sleeping places.", image_url: "https://laboni.design/media/image/83200S_8.jpg", sort_order: 10, active: true },
];

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#039;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&euro;", "\u20ac")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function optionKey(label: string) {
  const normalized = label.toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("\u00df", "ss");
  if (normalized.includes("farbe") || normalized.includes("color")) return "color";
  if (normalized.includes("grosse") || normalized.includes("size")) return "size";
  if (normalized.includes("material")) return "material";
  if (normalized.includes("stoff") || normalized.includes("fabric")) return "fabric";
  if (normalized.includes("matrat") || normalized.includes("mattress")) return "mattress";
  if (normalized.includes("ausfuhr") || normalized.includes("configuration")) return "configuration";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseGroups(html: string): SourceGroup[] {
  return [...html.matchAll(/<div class="variant--group">([\s\S]*?)(?=<div class="variant--group">|<\/form>)/g)].flatMap((match) => {
    const block = match[1];
    const rawLabel = block.match(/<p class="variant--name">\s*([^<]+?)\s*<\/p>/)?.[1];
    if (!rawLabel) return [];
    const label = decodeHtml(rawLabel);
    const options = [...block.matchAll(/<input[^>]+name="group\[(\d+)\]"[^>]+value="([^"]+)"[^>]+title="([^"]+)"/g)]
      .map((input) => ({ groupId: input[1], id: input[2], title: decodeHtml(input[3]) }));
    if (options.length === 0) return [];
    return [{ id: options[0].groupId, key: optionKey(label), label, options: options.map(({ id, title }) => ({ id, title })) }];
  });
}

function parseMoney(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9,.]/g, "").replaceAll(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSourceProduct(sourceUrl: string, html: string): SourceProduct {
  const name = decodeHtml(html.match(/<h1 class="product--title"[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const sku = decodeHtml(html.match(/<meta property="product:retailer_item_id" content="([^"]+)"/)?.[1] ?? "");
  const rawPrice = html.match(/<meta property="product:price" content="([^"]+)"/)?.[1];
  const price = rawPrice ? Number(rawPrice.replace(",", ".")) : null;
  const discountBlock = html.match(/<div class="product--price price--default price--discount">([\s\S]*?)<\/div>/)?.[1];
  const compareAtPrice = parseMoney(discountBlock?.match(/price--line-through">\s*([^<]+)/)?.[1]);
  const images = [...new Set([...html.matchAll(/data-img-original="([^"]+)"/g)].map((match) => decodeHtml(match[1])))];
  return { sourceUrl, name, sku, price: Number.isFinite(price) ? price : null, compareAtPrice, images, groups: parseGroups(html) };
}

async function fetchHtml(target: string, attempt = 1): Promise<string> {
  const response = await fetch(target, { headers: { "User-Agent": "Anna's Dog & More full catalog sync/1.0" } });
  if (response.ok) return response.text();
  if (attempt < 3) return fetchHtml(target, attempt + 1);
  throw new Error(`${response.status} ${target}`);
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

function categorySlug(product: SourceProduct) {
  const name = product.name.toLocaleLowerCase();
  if (product.sourceUrl.includes("/orthopaedisch/") || name.startsWith("ortho ")) return "orthopaedische-hundebetten";
  if (product.sourceUrl.includes("/zubehoer/") || /^(bezug|inlett|orthomattress|coolplus|mattress cover|bettrahmen)/i.test(product.name)) return "hundebett-zubehoer";
  if (product.sourceUrl.includes("/hundekissen/") || name.includes("luna lounge") || name.includes("hundekissen")) return "hundekissen";
  if (product.sourceUrl.includes("/herrchen-frauchen/") || name.includes("fragrance") || name.includes("duft")) return "raumduft";
  return "polsterbetten";
}

function originalCopy(name: string, locale: "de" | "en") {
  const lower = name.toLocaleLowerCase();
  if (lower.startsWith("ortho ")) return locale === "de" ? "Orthopädisches Hundebett mit druckentlastendem Schlafkomfort." : "Orthopaedic dog bed designed for pressure-relieving sleep comfort.";
  if (lower.startsWith("bezug")) return locale === "de" ? "Passender Wechselbezug für das angegebene LABONI Hundebett." : "Matching replacement cover for the specified LABONI dog bed.";
  if (lower.includes("inlett")) return locale === "de" ? "Austauschbares Inlett für den passenden LABONI Schlafplatz." : "Replaceable insert for the matching LABONI sleeping place.";
  if (lower.includes("mattress") || lower.includes("matrat")) return locale === "de" ? "Passende Matratzenlösung für ausgewählte LABONI Hundebetten." : "Matching mattress solution for selected LABONI dog beds.";
  if (lower.includes("bettgestell")) return locale === "de" ? "Design-Bettgestell zur Kombination mit einer passenden Matratze und einem Kissen." : "Designer bed frame to combine with a matching mattress and cushion.";
  if (lower.includes("luna") || lower.includes("hundekissen")) return locale === "de" ? "Bodennaher, komfortabler Ruheplatz für Hunde." : "A comfortable, low-profile resting place for dogs.";
  return locale === "de" ? "LABONI Schlafplatz mit hochwertiger Verarbeitung und pflegeleichten Materialien." : "LABONI sleeping place with quality craftsmanship and easy-care materials.";
}

function sourceId(sourceUrl: string) {
  return sourceUrl.match(/\/(\d+)\//)?.[1] ?? "source";
}

async function run() {
  const listingHtml = await Promise.all(listingPages.map((page) => fetchHtml(page)));
  const links = new Map<string, string>();
  listingHtml.forEach((html) => [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]+class="product--title"[^>]*>([\s\S]*?)<\/a>/g)]
    .forEach((match) => links.set(decodeHtml(match[1]), decodeHtml(match[2]))));

  const sources = await mapLimit([...links.keys()], 6, async (sourceUrl, index) => {
    const parsed = parseSourceProduct(sourceUrl, await fetchHtml(sourceUrl));
    process.stdout.write(`Read ${index + 1}/${links.size}: ${parsed.name || sourceUrl}\n`);
    return parsed;
  });

  const { error: categoryError } = await supabase.from("categories").upsert(categorySeeds, { onConflict: "id" });
  if (categoryError) throw categoryError;
  const { data: categories, error: categoriesError } = await supabase.from("categories").select("id,slug");
  if (categoriesError) throw categoriesError;
  const categoryIds = new Map((categories ?? []).map((category) => [category.slug, category.id]));

  const [{ data: existingProducts, error: productsError }, { data: existingVariants, error: variantsError }] = await Promise.all([
    supabase.from("products").select("id,slug,source_url"),
    supabase.from("product_variants").select("id,product_id,sku,stock_quantity"),
  ]);
  if (productsError) throw productsError;
  if (variantsError) throw variantsError;
  const bySource = new Map((existingProducts ?? []).filter((product) => product.source_url).map((product) => [product.source_url, product]));
  const usedSlugs = new Set((existingProducts ?? []).map((product) => product.slug));
  const variantsBySku = new Map((existingVariants ?? []).map((variant) => [variant.sku, variant]));
  const report = { discovered: sources.length, created: [] as string[], updated: [] as string[], aliases: [] as string[], missingPrice: [] as string[], missingSku: [] as string[] };

  for (const source of sources) {
    if (!source.name) continue;
    if (source.price === null) {
      report.missingPrice.push(source.sourceUrl);
      continue;
    }
    if (!source.sku) {
      report.missingSku.push(source.sourceUrl);
      continue;
    }

    const existing = bySource.get(source.sourceUrl);
    const conflictingVariant = variantsBySku.get(source.sku);
    if (!existing && conflictingVariant) {
      report.aliases.push(`${source.sourceUrl} -> ${source.sku}`);
      continue;
    }

    const rawSlug = new URL(source.sourceUrl).pathname.split("/").filter(Boolean).at(-1) ?? `product-${sourceId(source.sourceUrl)}`;
    const baseSlug = rawSlug.toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("\u00df", "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = existing?.slug ?? (usedSlugs.has(baseSlug) ? `${baseSlug}-${sourceId(source.sourceUrl)}` : baseSlug);
    usedSlugs.add(slug);
    const targetCategory = categorySlug(source);
    const categoryId = categoryIds.get(targetCategory);
    if (!categoryId) throw new Error(`Missing category ${targetCategory}`);
    const productPayload = {
      category_id: categoryId,
      slug,
      name_de: source.name,
      name_en: source.name,
      short_description_de: originalCopy(source.name, "de"),
      short_description_en: originalCopy(source.name, "en"),
      description_de: `${originalCopy(source.name, "de")} Varianten und Produktbilder werden direkt aus dem verknüpften LABONI Angebot übernommen.`,
      description_en: `${originalCopy(source.name, "en")} Variants and product images are synchronized from the linked LABONI offer.`,
      product_type: source.groups.length > 0 ? "configurable" : "simple",
      base_price: source.price,
      currency: "CHF",
      source_url: source.sourceUrl,
      active: true,
      featured: false,
    };

    let productId = existing?.id as string | undefined;
    if (productId) {
      const { error: updateError } = await supabase.from("products").update(productPayload).eq("id", productId);
      if (updateError) throw updateError;
      report.updated.push(slug);
    } else {
      const { data: inserted, error: insertError } = await supabase.from("products").insert(productPayload).select("id").single();
      if (insertError) throw insertError;
      productId = inserted.id;
      bySource.set(source.sourceUrl, { id: productId, slug, source_url: source.sourceUrl });
      report.created.push(slug);
    }

    let simpleVariantId: string | null = null;
    if (source.groups.length === 0) {
      const prior = variantsBySku.get(source.sku);
      const { data: variant, error: variantError } = await supabase.from("product_variants").upsert({
        product_id: productId,
        sku: source.sku,
        article_number: source.sku,
        price: source.price,
        compare_at_price: source.compareAtPrice,
        currency: "CHF",
        stock_quantity: prior?.stock_quantity ?? 0,
        visible: true,
        active: true,
        image_url: source.images[0] ?? null,
      }, { onConflict: "sku" }).select("id").single();
      if (variantError) throw variantError;
      simpleVariantId = variant.id;
      variantsBySku.set(source.sku, { id: variant.id, product_id: productId, sku: source.sku, stock_quantity: prior?.stock_quantity ?? 0 });
    }

    if (source.images.length > 0) {
      const { error: imageError } = await supabase.from("product_images").upsert(source.images.map((imageUrl, index) => ({
        product_id: productId,
        variant_id: simpleVariantId,
        url: imageUrl,
        alt_de: source.name,
        alt_en: source.name,
        sort_order: index,
      })), { onConflict: "product_id,url" });
      if (imageError) throw imageError;
    }

    const attributes = source.groups.map((group, index) => ({
      product_id: productId,
      attribute_name: group.key,
      value_de: group.options.map((option) => option.title).join(", "),
      value_en: group.options.map((option) => option.title).join(", "),
      sort_order: index,
    }));
    if (attributes.length > 0) {
      const { error: attributeError } = await supabase.from("product_attributes").upsert(attributes, { onConflict: "product_id,attribute_name" });
      if (attributeError) throw attributeError;
    }
  }

  process.stdout.write(`\nFull catalog import report\n${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : JSON.stringify(error, null, 2)}\n`);
  process.exitCode = 1;
});
