import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { ProductListing } from "@/components/product/product-listing";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) return null;
  const t = getDictionary(rawLocale);
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <div className="page-shell"><header className="page-intro"><nav aria-label="Breadcrumb"><a href={`/${rawLocale}`}>{t.nav.home}</a><span>/</span><span>{t.nav.shop}</span></nav><h1>{t.shop.title}</h1><p>{t.shop.intro}</p></header><ProductListing products={products} categories={categories} locale={rawLocale} /></div>;
}
