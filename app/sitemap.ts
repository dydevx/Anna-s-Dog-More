import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return ["de", "en"].flatMap((locale) => [
    { url: `${base}/${locale}`, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/${locale}/shop`, changeFrequency: "daily" as const, priority: 0.9 },
    ...categories.map((category) => ({ url: `${base}/${locale}/shop/${category.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((product) => ({ url: `${base}/${locale}/product/${product.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ]);
}
