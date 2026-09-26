import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { getCategories, getProducts } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/site-url";
import { ProductCard } from "@/components/product/product-card";

export const revalidate = 0;

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
  const categoryShowcases = [
    {
      slug: "decken",
      image: "https://laboni.design/media/image/_DSC8679_small.jpg",
      alt: locale === "de" ? "Hund entspannt auf einer weichen LABONI Decke" : "Dog relaxing on a soft LABONI blanket",
    },
    {
      slug: "spielen",
      image: "https://laboni.design/media/image/10700_3.jpg",
      alt: locale === "de" ? "Hund spielt draußen mit einem LABONI Tauspielzeug" : "Dog playing outdoors with a LABONI rope toy",
    },
    {
      slug: "leinen-halsbaender",
      image: "https://laboni.design/media/image/5011-105_2.jpg",
      alt: locale === "de" ? "Zwei Hunde mit eleganten LABONI Halsbändern" : "Two dogs wearing elegant LABONI collars",
    },
  ];
  const homeCategories = categoryShowcases.flatMap((showcase) => {
    const category = categoryList.find((item) => item.slug === showcase.slug);
    return category ? [{ category, ...showcase }] : [];
  });
  const featuredSlugs = ["classic-hundebett-bellagio", "rocky-napf", "boston-terrier-churchill-kunstdruck", "laboni-fragrance-edles-raumduft-set-zum-probierpreis"];
  const featured = featuredSlugs.map((slug) => productList.find((product) => product.slug === slug)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  const organization = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Anna's Dog & More",
    address: { "@type": "PostalAddress", streetAddress: "Leimbachstrasse 200", postalCode: "8041", addressLocality: "Zürich", addressCountry: "CH" },
    openingHours: ["Mo-Fr 09:00-18:00", "Sa 09:00-15:00"],
    url: `${getSiteUrl()}/${locale}`,
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    <section className="hero">
      <div className="hero-copy"><p className="hero-kicker">Anna&apos;s Dog & More, Zürich</p><h1>{t.home.heroTitle}</h1><p>{t.home.heroBody}</p><div className="hero-actions"><Link className="button primary-button" href={`/${locale}/shop`}>{t.common.discover}<ArrowRight size={18} /></Link><Link className="text-link" href={`/${locale}/about`}>{t.nav.about}</Link></div></div>
      <figure className="hero-image">
        <Image
          src="https://laboni.design/media/image/LABONI_Polsterbett_Teddy_beige_L_24.jpg"
          alt={locale === "de" ? "Hund in einem cremefarbenen LABONI TEDDY Hundebett" : "Dog in a cream LABONI TEDDY dog bed"}
          fill
          preload
          quality={90}
          sizes="(max-width: 820px) calc(100vw - 2rem), (max-width: 1440px) 54vw, 700px"
        />
      </figure>
    </section>

    <section className="section category-section" id="categories"><div className="section-heading"><h2>{t.home.categories}</h2><Link className="text-link" href={`/${locale}/shop/categories`}>{locale === "de" ? "Alle Kategorien" : "All categories"}<ArrowRight size={17} /></Link></div><div className="category-grid">
      {homeCategories.map(({ category, image, alt }, index) => <Link key={category.id} className={`category-tile category-${index + 1}`} href={`/${locale}/shop/${category.slug}`}><Image src={image} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" /><span><strong>{category.name[locale]}</strong><small>{category.description[locale]}</small></span></Link>)}
    </div></section>

    <section className="section featured-section"><div className="section-heading stacked"><h2>{t.home.selected}</h2><p>{locale === "de" ? "Wohnliche Formen, belastbare Materialien und Details, die den Alltag mit Hund leichter machen." : "Considered forms, durable materials and details that make daily life with dogs easier."}</p></div><div className="product-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} locale={locale} priority={index < 2} />)}</div></section>

    <section className="story-section"><div className="story-copy"><h2>{t.home.storyTitle}</h2><p>{t.home.storyBody}</p><Link className="button secondary-button" href={`/${locale}/about`}>{locale === "de" ? "Anna's kennenlernen" : "Meet Anna's"}</Link></div><div className="story-visual"><Image src="https://laboni.design/media/image/web_BT_Mood.jpg" alt={locale === "de" ? "Gerahmter Boston-Terrier-Kunstdruck in einem ruhigen Zuhause" : "Framed Boston Terrier art print in a calm home"} fill sizes="(max-width: 768px) 100vw, 45vw" /></div></section>

    <section className="collection-callout"><div><h2>{locale === "de" ? "Hundebetten mit Haltung" : "Dog beds with presence"}</h2><p>{locale === "de" ? "Komfortable Ruheplätze, ausgewählt für Hunde und ein schönes Zuhause." : "Comfortable places to rest, selected for dogs and considered homes."}</p><Link className="button light-button" href={`/${locale}/shop/polsterbetten`}>{t.common.discover}<ArrowRight size={18} /></Link></div><Image src="https://laboni.design/media/image/4102SX-715_3b.jpg" alt={locale === "de" ? "Windhund in einem hellen orthopädischen LABONI Hundebett" : "Sighthound in a light orthopaedic LABONI dog bed"} width={760} height={760} /></section>

    <section className="benefit-strip" aria-label={locale === "de" ? "Vorteile" : "Benefits"}>{t.home.benefits.map((benefit) => <div key={benefit}><CheckCircle size={21} weight="light" /><span>{benefit}</span></div>)}</section>
  </>;
}
