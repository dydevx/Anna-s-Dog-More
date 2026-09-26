import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getProductsByCategory } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getSiteUrl } from "@/lib/site-url";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductCard } from "@/components/product/product-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !isLocale(locale)) return {};
  const primaryImage = product.images[0];
  return { title: product.name[locale], description: product.shortDescription[locale], alternates: { canonical: `/${locale}/product/${slug}`, languages: { de: `/de/product/${slug}`, en: `/en/product/${slug}` } }, openGraph: primaryImage ? { images: [primaryImage.url] } : undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = (await getProductsByCategory(product.categorySlug)).filter((item) => item.id !== product.id).slice(0, 4);
  const t = getDictionary(locale);
  const priced = product.variants.filter((variant) => variant.active && variant.price !== null);
  const prices = priced.map((variant) => variant.price as number);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name[locale],
    description: product.shortDescription[locale],
    image: product.images.map((item) => item.url),
    sku: priced[0]?.sku ?? product.variants[0]?.sku,
    brand: { "@type": "Brand", name: "LABONI" },
    offers: prices.length > 0 ? {
      "@type": "AggregateOffer",
      priceCurrency: priced[0].currency,
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: priced.length,
      url: `${getSiteUrl()}/${locale}/product/${slug}`,
    } : undefined,
  };

  return <div className="product-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <nav className="product-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{t.nav.home}</Link><span>/</span><Link href={`/${locale}/shop/${product.categorySlug}`}>{product.categorySlug.replaceAll("-", " ")}</Link><span>/</span><span>{product.name[locale]}</span></nav>
    <ProductDetail product={product} locale={locale} />
    <section className="product-description"><div><h2>{t.product.details}</h2><p>{product.description[locale]}</p></div><dl>{Object.entries(product.attributes).map(([key, value]) => <div key={key}><dt>{t.product[key as keyof typeof t.product] ?? key}</dt><dd>{value}</dd></div>)}</dl></section>
    {related.length > 0 && <section className="related-products"><div className="section-heading stacked"><h2>{locale === "de" ? "Das könnte Ihnen auch gefallen" : "You may also like"}</h2></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} locale={locale} />)}</div></section>}
  </div>;
}
