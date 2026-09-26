import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getCategories, getProducts } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isDe = locale !== "en";

  return {
    title: isDe ? "Produktkategorien" : "Product categories",
    description: isDe
      ? "Alle Produktkategorien von Anna's Dog & More im Überblick."
      : "Browse every product category at Anna's Dog & More.",
    alternates: {
      canonical: `/${locale}/shop/categories`,
      languages: { de: "/de/shop/categories", en: "/en/shop/categories" },
    },
  };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) return null;

  const locale = rawLocale;
  const t = getDictionary(locale);
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  const directory = categories.map((category) => {
    const categoryProducts = products.filter((product) => product.categorySlug === category.slug);
    const representative = categoryProducts.find((product) => product.featured) ?? categoryProducts[0];

    return {
      category,
      count: categoryProducts.length,
      image: representative?.images[0],
    };
  });

  return (
    <div className="page-shell category-directory-page">
      <header className="page-intro category-directory-intro">
        <nav aria-label="Breadcrumb"><Link href={`/${locale}`}>{t.nav.home}</Link><span>/</span><Link href={`/${locale}/shop`}>{t.nav.shop}</Link><span>/</span><span>{t.nav.categories}</span></nav>
        <h1>{t.nav.categories}</h1>
        <p>{locale === "de" ? "Finden Sie Produkte nach ihrem Platz im Alltag mit Hund." : "Find products by the role they play in daily life with your dog."}</p>
      </header>

      <section className="category-directory-grid" aria-label={t.nav.categories}>
        {directory.map(({ category, count, image }) => (
          <Link className="category-directory-card" href={`/${locale}/shop/${category.slug}`} key={category.id}>
            {image && <Image src={image.url} alt={image.alt[locale]} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 66vw" />}
            <span>
              <strong>{category.name[locale]}</strong>
              <small>{count} {count === 1 ? (locale === "de" ? "Produkt" : "product") : (locale === "de" ? "Produkte" : "products")}</small>
              <ArrowRight size={19} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
