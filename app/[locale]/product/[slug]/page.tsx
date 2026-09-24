import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { getProductBySlug, getProductsByCategory } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/money";
import { getSiteUrl } from "@/lib/site-url";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductCard } from "@/components/product/product-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !isLocale(locale)) return {};
  return { title: product.name[locale], description: product.shortDescription[locale], alternates: { canonical: `/${locale}/product/${slug}`, languages: { de: `/de/product/${slug}`, en: `/en/product/${slug}` } }, openGraph: { images: [product.images[0].url] } };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = (await getProductsByCategory(product.categorySlug)).filter((item) => item.id !== product.id).slice(0, 4);
  const t = getDictionary(locale);
  const offer = product.variants.find((variant) => variant.active && variant.price !== null);
  const structuredData = { "@context": "https://schema.org", "@type": "Product", name: product.name[locale], description: product.shortDescription[locale], image: product.images.map((item) => item.url), sku: offer?.sku ?? product.variants[0]?.sku, brand: { "@type": "Brand", name: "LABONI" }, offers: offer ? { "@type": "Offer", priceCurrency: offer.currency, price: offer.price, availability: offer.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${getSiteUrl()}/${locale}/product/${slug}` } : undefined };
  return <div className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><nav className="product-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{t.nav.home}</Link><span>/</span><Link href={`/${locale}/shop/${product.categorySlug}`}>{product.categorySlug.replaceAll("-", " ")}</Link><span>/</span><span>{product.name[locale]}</span></nav><div className="product-detail"><ProductGallery images={product.images} locale={locale} /><section className="product-info"><p className="product-brand">LABONI</p><h1>{product.name[locale]}</h1><p className="product-price">{product.productType === "configurable" ? `${t.common.from} ` : ""}{formatMoney(product.basePrice, product.currency, locale)}</p><p className="tax-note">{locale === "de" ? "Versandkosten werden im Checkout berechnet." : "Shipping is calculated at checkout."}</p><p className="product-lede">{product.shortDescription[locale]}</p><ProductPurchase product={product} locale={locale} /><div className="source-note"><ShieldCheck size={20} /><span>{t.product.verified}</span></div></section></div><section className="product-description"><div><h2>{t.product.details}</h2><p>{product.description[locale]}</p></div><dl>{Object.entries(product.attributes).map(([key, value]) => <div key={key}><dt>{t.product[key as keyof typeof t.product] ?? key}</dt><dd>{value}</dd></div>)}</dl></section>{related.length > 0 && <section className="related-products"><div className="section-heading stacked"><h2>{locale === "de" ? "Das könnte Ihnen auch gefallen" : "You may also like"}</h2></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} locale={locale} />)}</div></section>}</div>;
}
