import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { getProductBySlug } from "@/lib/catalog";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/money";
import { ProductPurchase } from "@/components/product/product-purchase";

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
  const t = getDictionary(locale);
  const offer = product.variants.find((variant) => variant.active && variant.price !== null);
  const structuredData = { "@context": "https://schema.org", "@type": "Product", name: product.name[locale], description: product.shortDescription[locale], image: product.images.map((item) => item.url), sku: offer?.sku ?? product.variants[0]?.sku, brand: { "@type": "Brand", name: "LABONI" }, offers: offer ? { "@type": "Offer", priceCurrency: offer.currency, price: offer.price, availability: offer.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}/product/${slug}` } : undefined };
  return <div className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><nav className="product-breadcrumb" aria-label="Breadcrumb"><Link href={`/${locale}`}>{t.nav.home}</Link><span>/</span><Link href={`/${locale}/shop/${product.categorySlug}`}>{product.categorySlug.replaceAll("-", " ")}</Link><span>/</span><span>{product.name[locale]}</span></nav><div className="product-detail"><div className="product-gallery"><div className="product-main-image"><Image src={product.images[0].url} alt={product.images[0].alt[locale]} fill priority sizes="(max-width: 900px) 100vw, 58vw" /></div>{product.images.length > 1 && <div className="product-thumbnails">{product.images.map((item) => <Image key={item.id} src={item.url} alt={item.alt[locale]} width={104} height={104} />)}</div>}</div><section className="product-info"><p className="product-brand">LABONI</p><h1>{product.name[locale]}</h1><p className="product-price">{product.variants.length > 1 ? `${t.common.from} ` : ""}{formatMoney(product.basePrice, product.currency, locale)}</p><p className="tax-note">{locale === "de" ? "Versand wird im Checkout berechnet. Steuerangaben werden vor dem Shop-Start bestätigt." : "Shipping is calculated at checkout. Tax wording will be confirmed before launch."}</p><p className="product-lede">{product.shortDescription[locale]}</p><ProductPurchase product={product} locale={locale} /><div className="source-note"><ShieldCheck size={20} /><span>{t.product.verified}</span></div></section></div><section className="product-description"><div><h2>{t.product.details}</h2><p>{product.description[locale]}</p></div><dl>{Object.entries(product.attributes).map(([key, value]) => <div key={key}><dt>{t.product[key as keyof typeof t.product] ?? key}</dt><dd>{value}</dd></div>)}</dl></section></div>;
}
