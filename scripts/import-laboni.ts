import { createClient } from "@supabase/supabase-js";
import { categories, products } from "@/data/catalog";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { error: categoryError } = await supabase.from("categories").upsert(categories.map((category) => ({
    id: category.id,
    parent_id: category.parentId ?? null,
    slug: category.slug,
    name_de: category.name.de,
    name_en: category.name.en,
    description_de: category.description.de,
    description_en: category.description.en,
    image_url: category.imageUrl,
    sort_order: category.sortOrder,
    active: true,
  })), { onConflict: "id" });
  if (categoryError) throw categoryError;

  for (const product of products) {
    const { error: productError } = await supabase.from("products").upsert({
      id: product.id,
      category_id: product.categoryId,
      slug: product.slug,
      name_de: product.name.de,
      name_en: product.name.en,
      description_de: product.description.de,
      description_en: product.description.en,
      short_description_de: product.shortDescription.de,
      short_description_en: product.shortDescription.en,
      product_type: product.productType,
      base_price: product.basePrice,
      currency: product.currency,
      source_url: product.sourceUrl,
      active: product.active,
      featured: product.featured,
    }, { onConflict: "id" });
    if (productError) throw productError;

    const variants = product.variants.map((variant) => ({
      id: variant.id,
      product_id: product.id,
      sku: variant.sku,
      article_number: variant.articleNumber,
      price: variant.price,
      compare_at_price: variant.compareAtPrice ?? null,
      currency: variant.currency,
      stock_quantity: variant.stockQuantity,
      visible: true,
      active: variant.active,
      size: variant.options.size ?? null,
      color: variant.options.color ?? null,
      material: variant.options.material ?? null,
      fabric: variant.options.fabric ?? null,
      mattress_type: variant.options.mattress ?? null,
      configuration: variant.options.configuration ?? null,
      capacity: variant.options.capacity ?? null,
      image_url: variant.imageUrl ?? null,
    }));
    const { error: variantError } = await supabase.from("product_variants").upsert(variants, { onConflict: "id" });
    if (variantError) throw variantError;

    const images = product.images.map((item) => ({ product_id: product.id, url: item.url, alt_de: item.alt.de, alt_en: item.alt.en, sort_order: item.sortOrder }));
    const { error: imageError } = await supabase.from("product_images").upsert(images, { onConflict: "product_id,url" });
    if (imageError) throw imageError;

    const attributes = Object.entries(product.attributes).map(([name, value], index) => ({ product_id: product.id, attribute_name: name, value_de: value, value_en: value, sort_order: index }));
    if (attributes.length) {
      const { error: attributeError } = await supabase.from("product_attributes").upsert(attributes, { onConflict: "product_id,attribute_name" });
      if (attributeError) throw attributeError;
    }

    if (product.bundleItems?.length) {
      const bundleRows = product.bundleItems.map((item) => ({ set_product_id: product.id, child_sku: item.childSku, quantity: item.quantity }));
      const { error: bundleError } = await supabase.from("set_items").upsert(bundleRows, { onConflict: "set_product_id,child_sku" });
      if (bundleError) throw bundleError;
    }
  }
  process.stdout.write(`Imported ${categories.length} categories and ${products.length} products.\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
