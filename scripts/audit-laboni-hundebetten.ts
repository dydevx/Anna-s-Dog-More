import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const listingPages = ["https://laboni.design/hundebetten/", "https://laboni.design/hundebetten/?p=2", "https://laboni.design/hundebetten/?p=3"];
  const pages = await Promise.all(listingPages.map((source) => fetch(source).then((response) => response.text())));
  const urls = [...new Set(pages.flatMap((html) => [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]+class="product--title"/g)].map((match) => match[1])))];
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name_de,source_url,base_price,currency,categories(slug),product_variants(id,sku,price,currency),product_images(id)")
    .in("source_url", urls);
  if (error) throw error;

  const found = new Set((data ?? []).map((product) => product.source_url));
  const categoryCounts: Record<string, number> = {};
  for (const product of data ?? []) {
    const relation = product.categories as unknown as { slug?: string } | Array<{ slug?: string }> | null;
    const category = Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
    categoryCounts[category ?? "none"] = (categoryCounts[category ?? "none"] ?? 0) + 1;
  }
  const report = {
    listingUrls: urls.length,
    matchedProducts: data?.length ?? 0,
    missingUrls: urls.filter((source) => !found.has(source)),
    withoutVariants: (data ?? []).filter((product) => !product.product_variants?.length).map((product) => product.slug),
    withoutImages: (data ?? []).filter((product) => !product.product_images?.length).map((product) => product.slug),
    withoutProductPrice: (data ?? []).filter((product) => product.base_price === null).map((product) => product.slug),
    withoutVariantPrice: (data ?? []).flatMap((product) => product.product_variants.filter((variant) => variant.price === null).map((variant) => `${product.slug}:${variant.sku}`)),
    withoutSku: (data ?? []).flatMap((product) => product.product_variants.filter((variant) => !variant.sku).map((variant) => `${product.slug}:${variant.id}`)),
    nonChfProducts: (data ?? []).filter((product) => product.currency !== "CHF").map((product) => product.slug),
    nonChfVariants: (data ?? []).flatMap((product) => product.product_variants.filter((variant) => variant.currency !== "CHF").map((variant) => `${product.slug}:${variant.sku}`)),
    categories: categoryCounts,
    totalVariants: (data ?? []).reduce((total, product) => total + (product.product_variants?.length ?? 0), 0),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify(error, null, 2)}\n`);
  process.exitCode = 1;
});
