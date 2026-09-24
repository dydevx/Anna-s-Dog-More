export type Locale = "de" | "en";

export type LocalizedText = {
  de: string;
  en: string;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: LocalizedText;
  sortOrder: number;
  variantId?: string;
  color?: string;
  isPrimary?: boolean;
};

export type ProductVariant = {
  id: string;
  sku: string;
  articleNumber: string;
  price: number | null;
  compareAtPrice?: number | null;
  currency: string;
  stockQuantity: number;
  active: boolean;
  options: Record<string, string>;
  imageUrl?: string;
};

export type Category = {
  id: string;
  slug: string;
  parentId?: string | null;
  name: LocalizedText;
  description: LocalizedText;
  imageUrl: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  categoryId: string;
  categorySlug: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  productType: "simple" | "configurable" | "bundle";
  basePrice: number;
  currency: string;
  featured: boolean;
  active: boolean;
  badge?: "new" | "sale";
  sourceUrl: string;
  attributes: Record<string, string>;
  images: ProductImage[];
  variants: ProductVariant[];
  bundleItems?: Array<{ childSku: string; quantity: number }>;
};

export type CartLine = {
  id: string;
  productId: string;
  productSlug: string;
  variantId: string;
  sku: string;
  articleNumber: string;
  options: Record<string, string>;
  name: LocalizedText;
  variantLabel: LocalizedText;
  imageUrl: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  maxQuantity: number;
};
