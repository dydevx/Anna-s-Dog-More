import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { categories as fallbackCategories, products as fallbackProducts } from "@/data/catalog";
import type { Category, Product } from "@/types/catalog";
import { isProductStorefrontReady } from "@/lib/catalog-readiness";

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function fallbackAllowed() {
  return process.env.CATALOG_FALLBACK_ENABLED !== "false";
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const client = publicClient();
  if (!client) return fallbackAllowed() ? fallbackCategories : [];
  const { data, error } = await client.from("categories").select("*").eq("active", true).order("sort_order");
  if (error) throw new Error(`Unable to load categories: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    parentId: row.parent_id,
    name: { de: row.name_de, en: row.name_en },
    description: { de: row.description_de ?? "", en: row.description_en ?? "" },
    imageUrl: row.image_url ?? "",
    sortOrder: row.sort_order,
  }));
});

export const getProducts = cache(async (): Promise<Product[]> => {
  const client = publicClient();
  if (!client) return fallbackAllowed() ? fallbackProducts.filter(isProductStorefrontReady) : [];
  const { data, error } = await client
    .from("products")
    .select("*, categories(slug), product_images(*), product_variants(*), product_attributes(*)")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load products: ${error.message}`);
  const products = data.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categorySlug: row.categories?.slug ?? "shop",
    slug: row.slug,
    name: { de: row.name_de, en: row.name_en },
    shortDescription: { de: row.short_description_de ?? "", en: row.short_description_en ?? "" },
    description: { de: row.description_de ?? "", en: row.description_en ?? "" },
    productType: row.product_type,
    basePrice: Number(row.base_price),
    currency: row.currency,
    featured: row.featured,
    active: row.active,
    sourceUrl: row.source_url ?? "",
    attributes: Object.fromEntries((row.product_attributes ?? []).map((item: Record<string, unknown>) => [String(item.attribute_name), String(item.value_en ?? item.value_de ?? "")])),
    images: (row.product_images ?? []).toSorted((a: Record<string, unknown>, b: Record<string, unknown>) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      url: String(item.url),
      alt: { de: String(item.alt_de ?? ""), en: String(item.alt_en ?? "") },
      sortOrder: Number(item.sort_order ?? 0),
      variantId: item.variant_id ? String(item.variant_id) : undefined,
      color: item.color
        ? String(item.color)
        : item.variant_id
          ? String((row.product_variants ?? []).find((variant: Record<string, unknown>) => String(variant.id) === String(item.variant_id))?.color ?? "") || undefined
          : undefined,
      isPrimary: Boolean(item.is_primary),
    })),
    variants: (row.product_variants ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id),
      sku: String(item.sku),
      articleNumber: String(item.article_number),
      price: item.price === null ? null : Number(item.price),
      compareAtPrice: item.compare_at_price === null ? null : Number(item.compare_at_price),
      currency: String(item.currency ?? row.currency),
      stockQuantity: Number(item.stock_quantity),
      active: Boolean(item.active),
      options: Object.fromEntries([
        ["size", item.size], ["color", item.color], ["material", item.material],
        ["fabric", item.fabric], ["mattress", item.mattress_type],
        ["configuration", item.configuration], ["capacity", item.capacity],
      ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)),
      imageUrl: item.image_url ? String(item.image_url) : undefined,
    })),
  })) as Product[];

  return products.filter(isProductStorefrontReady);
});

export async function getProductBySlug(slug: string) {
  return (await getProducts()).find((product) => product.slug === slug) ?? null;
}

export async function getProductsByCategory(slug: string) {
  return (await getProducts()).filter((product) => product.categorySlug === slug);
}

export async function searchProducts(query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (term.length < 2) return [];
  return (await getProducts()).filter((product) => {
    const haystack = [
      product.name.de,
      product.name.en,
      product.description.de,
      product.description.en,
      product.categorySlug,
      ...product.variants.flatMap((variant) => [variant.sku, variant.articleNumber]),
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(term);
  }).slice(0, 8);
}
