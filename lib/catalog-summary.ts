import type { Product, ProductSummary } from "@/types/catalog";

export function toProductSummary(product: Product): ProductSummary {
  const facets = Object.fromEntries(["material", "fabric", "color", "size"].map((key) => [key,
    [...new Set([
      ...product.variants.map((variant) => variant.options[key]).filter(Boolean),
      ...(product.attributes[key]?.split(",").map((value) => value.trim()).filter(Boolean) ?? []),
    ])],
  ]));
  return {
    id: product.id, categoryId: product.categoryId, categorySlug: product.categorySlug,
    slug: product.slug, name: product.name, basePrice: product.basePrice,
    currency: product.currency, featured: product.featured, badge: product.badge,
    images: product.images.slice(0, 1), facets,
    available: product.variants.some((variant) => variant.active && variant.price !== null && variant.stockQuantity > 0),
    priceFrom: product.productType === "configurable" || product.variants.length > 1
      || product.variants.some((variant) => variant.price === null),
  };
}
