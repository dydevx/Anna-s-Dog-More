import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { categories as fallbackCategories, products as fallbackProducts } from "@/data/catalog";
import type { Category, Product, ProductSummary } from "@/types/catalog";
import { isProductStorefrontReady } from "@/lib/catalog-readiness";
import { toProductSummary } from "@/lib/catalog-summary";
import { CATALOG_CACHE_TAG, CATALOG_REVALIDATE_SECONDS } from "@/lib/catalog-cache";

export const SUMMARY_SELECT = "id,category_id,slug,name_de,name_en,product_type,base_price,currency,featured,active,categories(slug),product_images(id,url,alt_de,alt_en,sort_order),product_variants(active,price,stock_quantity,size,color,material,fabric),product_attributes(attribute_name,value_de,value_en)";
const SEARCH_SELECT = SUMMARY_SELECT.replace("product_variants(active", "product_variants(sku,article_number,active") + ",description_de,description_en";

type CatalogRow = {
  id: string; category_id: string; slug: string; name_de: string; name_en: string;
  short_description_de?: string | null; short_description_en?: string | null;
  description_de?: string | null; description_en?: string | null;
  product_type: Product["productType"]; base_price: string | number; currency: string;
  featured: boolean; active: boolean; source_url?: string | null;
  categories: { slug: string } | null;
  product_images: Record<string, unknown>[];
  product_variants: Record<string, unknown>[];
  product_attributes: Record<string, unknown>[];
};

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Only public catalog reads use this client; private and checkout data stay uncached.
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: "force-cache",
        next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_CACHE_TAG] },
      }),
    },
  });
}

function fallbackAllowed() {
  return process.env.CATALOG_FALLBACK_ENABLED !== "false";
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const client = publicClient();
  if (!client) return fallbackAllowed() ? fallbackCategories : [];
  const { data, error } = await client.from("categories").select("id,slug,parent_id,name_de,name_en,description_de,description_en,image_url,sort_order").eq("active", true).order("sort_order");
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

async function loadProducts({ slug, categoryId, summary = false, search = false }: { slug?: string; categoryId?: string; summary?: boolean; search?: boolean } = {}): Promise<Product[]> {
  const client = publicClient();
  if (!client) return fallbackAllowed() ? fallbackProducts.filter((product) => isProductStorefrontReady(product)
    && (!slug || product.slug === slug) && (!categoryId || product.categoryId === categoryId)) : [];
  let query = client
    .from("products")
    .select(summary ? (search ? SEARCH_SELECT : SUMMARY_SELECT) : "*, categories(slug), product_images(*), product_variants(*), product_attributes(*)")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (slug) query = query.eq("slug", slug);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (summary) query = query.order("sort_order", { referencedTable: "product_images", ascending: true })
    .order("id", { referencedTable: "product_images", ascending: true })
    .limit(1, { referencedTable: "product_images" });
  const { data, error } = await query.overrideTypes<CatalogRow[], { merge: false }>();
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
    attributes: Object.fromEntries((row.product_attributes ?? [])
      .filter((item: Record<string, unknown>) => String(item.attribute_name) !== "source")
      .map((item: Record<string, unknown>) => [String(item.attribute_name), String(item.value_en ?? item.value_de ?? "")])),
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
      sku: String(item.sku ?? ""),
      articleNumber: String(item.article_number ?? ""),
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
}

export const getProductSummaries = cache(async (): Promise<ProductSummary[]> =>
  (await loadProducts({ summary: true })).map(toProductSummary));

export const getProductBySlug = cache(async (slug: string) =>
  (await loadProducts({ slug }))[0] ?? null);

export const getProductsByCategory = cache(async (slug: string) => {
  const category = (await getCategories()).find((item) => item.slug === slug);
  return category ? (await loadProducts({ categoryId: category.id, summary: true })).map(toProductSummary) : [];
});

export async function searchProducts(query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (term.length < 2) return [];
  return (await loadProducts({ summary: true, search: true })).filter((product) => {
    const haystack = [
      product.name.de,
      product.name.en,
      product.description.de,
      product.description.en,
      product.categorySlug,
      ...product.variants.flatMap((variant) => [variant.sku, variant.articleNumber]),
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(term);
  }).slice(0, 8).map(toProductSummary);
}
