import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase environment variables");
const supabase = createClient(url, key, { auth: { persistSession: false } });

type ProductRow = {
  id: string;
  slug: string;
  source_url: string;
  product_variants: Array<{ id: string; sku: string }>;
  product_images: Array<{ id: string; url: string }>;
  product_attributes: Array<{ id: string; attribute_name: string }>;
};

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,source_url,product_variants(id,sku),product_images(id,url),product_attributes(id,attribute_name)")
    .eq("active", true)
    .like("source_url", "https://laboni.design/%");
  if (error) throw error;

  const grouped = Object.groupBy((data ?? []) as ProductRow[], (product) => product.source_url);
  const report: Array<{ sourceUrl: string; canonical: string; deactivated: string[]; movedVariants: string[] }> = [];

  for (const [sourceUrl, group] of Object.entries(grouped)) {
    if (!group || group.length < 2) continue;
    const ranked = [...group].sort((a, b) => (b.product_images.length * 10 + b.product_variants.length) - (a.product_images.length * 10 + a.product_variants.length));
    const canonical = ranked[0];
    const canonicalImageUrls = new Set(canonical.product_images.map((image) => image.url));
    const canonicalAttributes = new Set(canonical.product_attributes.map((attribute) => attribute.attribute_name));
    const deactivated: string[] = [];
    const movedVariants: string[] = [];

    for (const duplicate of ranked.slice(1)) {
      for (const variant of duplicate.product_variants) {
        const { error: variantError } = await supabase.from("product_variants").update({ product_id: canonical.id }).eq("id", variant.id);
        if (variantError) throw variantError;
        movedVariants.push(variant.sku);
      }
      for (const image of duplicate.product_images) {
        if (canonicalImageUrls.has(image.url)) continue;
        const { error: imageError } = await supabase.from("product_images").update({ product_id: canonical.id }).eq("id", image.id);
        if (imageError) throw imageError;
        canonicalImageUrls.add(image.url);
      }
      for (const attribute of duplicate.product_attributes) {
        if (canonicalAttributes.has(attribute.attribute_name)) continue;
        const { error: attributeError } = await supabase.from("product_attributes").update({ product_id: canonical.id }).eq("id", attribute.id);
        if (attributeError) throw attributeError;
        canonicalAttributes.add(attribute.attribute_name);
      }
      const { error: productError } = await supabase.from("products").update({ active: false }).eq("id", duplicate.id);
      if (productError) throw productError;
      deactivated.push(duplicate.slug);
    }
    report.push({ sourceUrl, canonical: canonical.slug, deactivated, movedVariants });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : JSON.stringify(error, null, 2)}\n`);
  process.exitCode = 1;
});
