import { createClient } from "@supabase/supabase-js";

type SourceOption = { id: string; title: string };
type SourceGroup = { id: string; key: string; options: SourceOption[] };
type Combination = Record<string, SourceOption>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#039;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .trim();
}

function optionKey(label: string) {
  const normalized = label.toLocaleLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("ß", "ss");
  if (normalized.includes("farbe") || normalized.includes("color")) return "color";
  if (normalized.includes("grosse") || normalized.includes("size")) return "size";
  if (normalized.includes("material")) return "material";
  if (normalized.includes("stoff") || normalized.includes("fabric")) return "fabric";
  if (normalized.includes("matrat") || normalized.includes("mattress")) return "mattress";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseGroups(html: string): SourceGroup[] {
  return [...html.matchAll(/<div class="variant--group">([\s\S]*?)(?=<div class="variant--group">|<\/form>)/g)].flatMap((match) => {
    const block = match[1];
    const label = block.match(/<p class="variant--name">\s*([^<]+?)\s*<\/p>/)?.[1];
    if (!label) return [];
    const options = [...block.matchAll(/<input[^>]+name="group\[(\d+)\]"[^>]+value="([^"]+)"[^>]+title="([^"]+)"/g)]
      .map((input) => ({ groupId: input[1], id: input[2], title: decodeHtml(input[3]) }));
    if (options.length === 0) return [];
    return [{ id: options[0].groupId, key: optionKey(decodeHtml(label)), options: options.map(({ id, title }) => ({ id, title })) }];
  });
}

function combinations(groups: SourceGroup[]): Combination[] {
  return groups.reduce<Combination[]>((current, group) => current.flatMap((combination) => group.options.map((option) => ({ ...combination, [group.key]: option }))), [{}]);
}

function cleanOption(key: string, title: string) {
  if (key === "size") return title.match(/^([^\s-]+)/)?.[1] ?? title;
  return title;
}

function extract(html: string) {
  const sku = decodeHtml(html.match(/<meta property="product:retailer_item_id" content="([^"]+)"/)?.[1] ?? "");
  const rawPrice = html.match(/<meta property="product:price" content="([^"]+)"/)?.[1];
  const price = rawPrice ? Number(rawPrice.replace(",", ".")) : null;
  const images = [...new Set([...html.matchAll(/data-img-original="([^"]+)"/g)].map((match) => decodeHtml(match[1])))];
  const sourceAvailability = html.match(/<meta property="product:availability" content="([^"]+)"/)?.[1] ?? null;
  return { sku, price: Number.isFinite(price) ? price : null, images, sourceAvailability };
}

async function sourceHtml(sourceUrl: string, combination?: Combination, groups?: SourceGroup[]) {
  const target = new URL(sourceUrl);
  if (combination && groups) groups.forEach((group) => target.searchParams.set(`group[${group.id}]`, combination[group.key].id));
  const response = await fetch(target, { headers: { "User-Agent": "Anna's Dog & More catalog sync/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${target}`);
  return response.text();
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

async function run() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id,slug,name_de,source_url,product_variants(id,sku,stock_quantity,fabric,mattress_type)")
    .not("source_url", "is", null)
    .like("source_url", "https://laboni.design/%");
  if (error) throw error;

  const candidates = (products ?? []).filter((product) => product.source_url && ["classic-hundebett", "prado-design-hundebett", "vogue-design-hundebett", "luna-lounge-set"].some((name) => product.slug.startsWith(name)));
  const report: Array<{ product: string; variants: number; missingPrice: string[]; missingImage: string[]; missingStock: string[] }> = [];

  for (const product of candidates) {
    const baseHtml = await sourceHtml(product.source_url);
    const groups = parseGroups(baseHtml);
    if (groups.length === 0) {
      report.push({ product: product.slug, variants: 0, missingPrice: ["No source configurator"], missingImage: [], missingStock: ["Source quantity unavailable"] });
      continue;
    }

    const requested = combinations(groups);
    const scraped = await mapLimit(requested, 4, async (combination) => ({ combination, ...extract(await sourceHtml(product.source_url, combination, groups)) }));
    const unique = new Map<string, (typeof scraped)[number]>();
    scraped.forEach((item) => { if (item.sku) unique.set(item.sku, item); });
    const existing = new Map((product.product_variants ?? []).map((variant: { sku: string; stock_quantity: number }) => [variant.sku, variant]));
    const defaults = product.product_variants?.[0] as { fabric?: string | null; mattress_type?: string | null } | undefined;
    const rows = [...unique.values()].map((item) => {
      const options = Object.fromEntries(Object.entries(item.combination).map(([option, value]) => [option, cleanOption(option, value.title)]));
      return {
        product_id: product.id,
        sku: item.sku,
        article_number: item.sku,
        price: item.price,
        currency: "CHF",
        stock_quantity: existing.get(item.sku)?.stock_quantity ?? 0,
        visible: true,
        active: item.price !== null,
        size: options.size ?? null,
        color: options.color ?? null,
        material: options.material ?? null,
        fabric: options.fabric ?? defaults?.fabric ?? null,
        mattress_type: options.mattress ?? defaults?.mattress_type ?? null,
        image_url: item.images[0] ?? null,
      };
    });

    const { data: saved, error: variantError } = await supabase.from("product_variants").upsert(rows, { onConflict: "sku" }).select("id,sku,color,size");
    if (variantError) throw variantError;
    const savedBySku = new Map((saved ?? []).map((variant) => [variant.sku, variant]));

    const firstGalleryByColor = new Map<string, (typeof scraped)[number]>();
    [...unique.values()].forEach((item) => {
      const color = item.combination.color?.title ?? "__default";
      if (!firstGalleryByColor.has(color) && item.images.length > 0) firstGalleryByColor.set(color, item);
    });
    for (const [color, item] of firstGalleryByColor) {
      const variant = savedBySku.get(item.sku);
      if (!variant) continue;
      const imageRows = item.images.map((imageUrl, index) => ({
        product_id: product.id,
        variant_id: variant.id,
        url: imageUrl,
        alt_de: `${product.name_de}${color === "__default" ? "" : ` – ${color}`}`,
        alt_en: `${product.name_de}${color === "__default" ? "" : ` – ${color}`}`,
        sort_order: index,
      }));
      const { error: imageError } = await supabase.from("product_images").upsert(imageRows, { onConflict: "product_id,url" });
      if (imageError) throw imageError;
    }

    const prices = rows.map((row) => row.price).filter((price): price is number => price !== null);
    if (prices.length > 0) {
      const { error: priceError } = await supabase.from("products").update({ base_price: Math.min(...prices), currency: "CHF" }).eq("id", product.id);
      if (priceError) throw priceError;
    }

    report.push({
      product: product.slug,
      variants: rows.length,
      missingPrice: rows.filter((row) => row.price === null).map((row) => row.sku),
      missingImage: rows.filter((row) => !row.image_url).map((row) => row.sku),
      missingStock: rows.map((row) => row.sku),
    });
    process.stdout.write(`Synced ${product.slug}: ${rows.length} source variants.\n`);
  }

  process.stdout.write(`\nMissing source data report\n${JSON.stringify(report, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
