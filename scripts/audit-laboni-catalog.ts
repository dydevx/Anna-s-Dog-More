import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase environment variables");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const listingRoots = ["hundebetten", "decken", "spielen", "napf-rocky", "leinen-halsbaender", "herrchen-frauchen", "sale"];

async function fetchHtml(target: string) {
  const response = await fetch(target, { headers: { "User-Agent": "Anna's Dog & More catalog audit/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${target}`);
  return response.text();
}

async function main() {
  const sourceUrls = new Set<string>();
  const listingCounts: Record<string, number> = {};

  for (const listingRoot of listingRoots) {
    const groupUrls = new Set<string>();
    for (let page = 1; page <= 20; page++) {
      const source = `https://laboni.design/${listingRoot}/${page === 1 ? "" : `?p=${page}`}`;
      let html: string;
      try {
        html = await fetchHtml(source);
      } catch (error) {
        if (page > 1 && error instanceof Error && error.message.startsWith("404 ")) break;
        throw error;
      }
      const found = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]+class="product--title"/g)].map((match) => match[1]);
      const before = groupUrls.size;
      found.forEach((item) => groupUrls.add(item));
      if (found.length === 0 || groupUrls.size === before) break;
    }
    listingCounts[listingRoot] = groupUrls.size;
    groupUrls.forEach((item) => sourceUrls.add(item));
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,slug,source_url,base_price,currency,active,categories(slug),product_variants(id,sku,price,currency,active),product_images(id)");
  if (error) throw error;

  const products = (data ?? []).filter((product) => product.active && product.source_url && sourceUrls.has(product.source_url));
  const unexpectedActiveProducts = (data ?? []).filter((product) => product.active && product.source_url?.startsWith("https://laboni.design/") && !sourceUrls.has(product.source_url));
  const found = new Set(products.map((product) => product.source_url));
  const categoryCounts: Record<string, number> = {};
  for (const product of products) {
    const relation = product.categories as unknown as { slug?: string } | Array<{ slug?: string }> | null;
    const category = Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
    categoryCounts[category ?? "none"] = (categoryCounts[category ?? "none"] ?? 0) + 1;
  }

  const report = {
    listingCounts,
    uniqueSourceProducts: sourceUrls.size,
    matchedProducts: products.length,
    missingUrls: [...sourceUrls].filter((source) => !found.has(source)),
    unexpectedActiveProducts: unexpectedActiveProducts.map((product) => ({ slug: product.slug, sourceUrl: product.source_url })),
    withoutVariants: products.filter((product) => !product.product_variants?.some((variant) => variant.active)).map((product) => product.slug),
    withoutImages: products.filter((product) => !product.product_images?.length).map((product) => product.slug),
    withoutProductPrice: products.filter((product) => product.base_price === null).map((product) => product.slug),
    withoutVariantPrice: products.flatMap((product) => product.product_variants.filter((variant) => variant.active && variant.price === null).map((variant) => `${product.slug}:${variant.sku}`)),
    withoutSku: products.flatMap((product) => product.product_variants.filter((variant) => variant.active && !variant.sku).map((variant) => `${product.slug}:${variant.id}`)),
    nonChfProducts: products.filter((product) => product.currency !== "CHF").map((product) => product.slug),
    nonChfVariants: products.flatMap((product) => product.product_variants.filter((variant) => variant.active && variant.currency !== "CHF").map((variant) => `${product.slug}:${variant.sku}`)),
    categories: categoryCounts,
    totalVariants: products.reduce((total, product) => total + product.product_variants.filter((variant) => variant.active).length, 0),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : JSON.stringify(error, null, 2)}\n`);
  process.exitCode = 1;
});
