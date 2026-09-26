import type { Product } from "@/types/catalog";

export function isProductStorefrontReady(
  product: Pick<Product, "images" | "variants">,
) {
  return product.images.length > 0
    && product.variants.some((variant) => variant.active && variant.price !== null);
}
