import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { ProductListing } from "@/components/product/product-listing";

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) notFound();
  const [categories, allProducts] = await Promise.all([getCategories(), getProducts()]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return <div className="page-shell"><header className="page-intro"><nav aria-label="Breadcrumb"><a href={`/${locale}`}>{locale === "de" ? "Startseite" : "Home"}</a><span>/</span><a href={`/${locale}/shop`}>Shop</a><span>/</span><span>{category.name[locale]}</span></nav><h1>{category.name[locale]}</h1><p>{category.description[locale]}</p></header><ProductListing products={allProducts} categories={categories} locale={locale} initialCategory={slug} />{slug === "polsterbetten" && <section className="category-story"><h2>{locale === "de" ? "Komfort, der im Alltag besteht" : "Comfort made for everyday life"}</h2><div><p>{locale === "de" ? "Hochwertige Hundebetten müssen zwei Perspektiven verbinden: gesunden Liegekomfort für den Hund und eine klare, wohnliche Gestaltung für sein Zuhause." : "A quality dog bed has to bring two perspectives together: healthy resting comfort for the dog and a calm, considered presence in the home."}</p><p>{locale === "de" ? "Austauschbare Bezüge, durchdachte Füllungen und belastbare Möbelstoffe machen die Kollektion pflegeleicht, funktional und langlebig." : "Replaceable covers, considered fillings and durable upholstery fabrics make the collection practical, functional and long-lasting."}</p></div></section>}</div>;
}
