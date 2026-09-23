import { notFound } from "next/navigation";
import { getCategories, getProducts, getProductsByCategory } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { ProductListing } from "@/components/product/product-listing";

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) notFound();
  const [categories, allProducts, products] = await Promise.all([getCategories(), getProducts(), getProductsByCategory(slug)]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return <div className="page-shell"><header className="page-intro"><nav aria-label="Breadcrumb"><a href={`/${locale}`}>{locale === "de" ? "Startseite" : "Home"}</a><span>/</span><a href={`/${locale}/shop`}>Shop</a><span>/</span><span>{category.name[locale]}</span></nav><h1>{category.name[locale]}</h1><p>{category.description[locale]}</p></header><ProductListing products={products.length ? products : allProducts} categories={categories} locale={locale} initialCategory={slug} /></div>;
}
