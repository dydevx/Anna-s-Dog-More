import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { getCategories, getProducts } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { ProductCard } from "@/components/product/product-card";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const de = locale !== "en";
  return {
    title: de ? "Premium Hundezubehör in Zürich" : "Premium dog products in Zurich",
    description: de ? "Ausgewählte LABONI Hundebetten, Spielzeuge und Accessoires bei Anna's Dog & More in Zürich." : "Selected LABONI dog beds, toys and accessories at Anna's Dog & More in Zurich.",
    alternates: { canonical: `/${locale}`, languages: { de: "/de", en: "/en" } },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) return null;
  const locale = rawLocale;
  const t = getDictionary(locale);
  const [categoryList, productList] = await Promise.all([getCategories(), getProducts()]);
  const categorySlugs = ["spielen", "rocky-napf", "polsterbetten"];
  const homeCategories = categorySlugs.map((slug) => categoryList.find((category) => category.slug === slug)).filter(Boolean);
  const featured = productList.filter((product) => product.featured).slice(0, 4);
  const organization = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Anna's Dog & More",
    address: { "@type": "PostalAddress", streetAddress: "Leimbachstrasse 200", postalCode: "8041", addressLocality: "Zürich", addressCountry: "CH" },
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}`,
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    <section className="hero">
      <div className="hero-copy"><p className="hero-kicker">Anna&apos;s Dog & More · Zürich</p><h1>{t.home.heroTitle}</h1><p>{t.home.heroBody}</p><div className="hero-actions"><Link className="button primary-button" href={`/${locale}/shop`}>{t.common.discover}<ArrowRight size={18} /></Link><Link className="text-link" href={`/${locale}/about`}>{t.nav.about}</Link></div></div>
      <div className="hero-image"><Image src="https://laboni.design/media/image/thumbnail/LABONI_Polsterbett_Teddy_beige_L_24_600x600.jpg" alt={locale === "de" ? "Hund in einem cremefarbenen LABONI TEDDY Hundebett" : "Dog in a cream LABONI TEDDY dog bed"} fill priority sizes="(max-width: 768px) 100vw, 56vw" /></div>
    </section>

    <section className="section category-section" id="categories"><div className="section-heading"><h2>{t.home.categories}</h2><Link className="text-link" href={`/${locale}/shop`}>{locale === "de" ? "Alle Kategorien" : "All categories"}<ArrowRight size={17} /></Link></div><div className="category-grid">
      {homeCategories.map((category, index) => category && <Link key={category.id} className={`category-tile category-${index + 1}`} href={`/${locale}/shop/${category.slug}`}><Image src={category.imageUrl} alt={category.name[locale]} fill sizes="(max-width: 768px) 100vw, 50vw" /><span><strong>{category.name[locale]}</strong><small>{category.description[locale]}</small></span></Link>)}
    </div></section>

    <section className="section featured-section"><div className="section-heading stacked"><h2>{t.home.selected}</h2><p>{locale === "de" ? "Produkte, deren Material, Artikelnummer und Preis wir gegen die aktuellen Quellen geprüft haben." : "Products whose material, article number and price have been checked against current sources."}</p></div><div className="product-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 2} />)}</div></section>

    <section className="story-section"><div className="story-copy"><h2>{t.home.storyTitle}</h2><p>{t.home.storyBody}</p><Link className="button secondary-button" href={`/${locale}/about`}>{locale === "de" ? "Unsere Auswahl" : "Our selection"}</Link></div><div className="story-visual"><Image src="https://laboni.design/media/image/thumbnail/30000_1nZGZg3ovmXlRX_600x600.jpg" alt={locale === "de" ? "ROCKY Napf aus finnischem Speckstein" : "ROCKY bowl made from Finnish soapstone"} fill sizes="(max-width: 768px) 100vw, 45vw" /></div></section>

    <section className="collection-callout"><div><h2>{locale === "de" ? "Spielzeug mit Charakter" : "Toys with character"}</h2><p>{locale === "de" ? "Handgeknüpfte Baumwollfiguren für Spiel und Zahnpflege." : "Hand-knotted cotton characters for play and dental care."}</p><Link className="button light-button" href={`/${locale}/shop/spielen`}>{t.common.discover}<ArrowRight size={18} /></Link></div><Image src="https://laboni.design/media/image/thumbnail/13000_600x600.jpg" alt={locale === "de" ? "Big Ocean LABONI Spielzeug-Set" : "Big Ocean LABONI toy set"} width={560} height={560} /></section>

    <section className="benefit-strip" aria-label={locale === "de" ? "Vorteile" : "Benefits"}>{t.home.benefits.map((benefit) => <div key={benefit}><CheckCircle size={21} weight="light" /><span>{benefit}</span></div>)}</section>
  </>;
}
