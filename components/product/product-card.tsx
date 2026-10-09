import Image from "next/image";
import Link from "next/link";
import type { Locale, Product, ProductSummary } from "@/types/catalog";
import { toProductSummary } from "@/lib/catalog-summary";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductCard({ product, locale, priority = false }: { product: Product | ProductSummary; locale: Locale; priority?: boolean }) {
  const t = getDictionary(locale);
  const primaryImage = product.images[0];
  const summary = "variants" in product ? toProductSummary(product) : product;
  const from = summary.priceFrom;
  const soldOut = !summary.available;
  return <article className="product-card">
    <Link className="product-image" href={`/${locale}/product/${product.slug}`}>
      {primaryImage
        ? <Image src={primaryImage.url} alt={primaryImage.alt[locale]} fill sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw" preload={priority} />
        : <span className="product-image-placeholder">{locale === "de" ? "Bild folgt" : "Image pending"}</span>}
      {product.badge && <span className="product-badge">{product.badge === "new" ? (locale === "de" ? "Neu" : "New") : "Sale"}</span>}
      {soldOut && <span className="product-badge muted-badge">{locale === "de" ? "Bestand folgt" : "Stock pending"}</span>}
    </Link>
    <div className="product-card-copy">
      <p>{product.categorySlug.replaceAll("-", " ")}</p>
      <h3><Link href={`/${locale}/product/${product.slug}`}>{product.name[locale]}</Link></h3>
      <div className="product-card-meta"><span>{from ? `${t.common.from} ` : ""}{formatMoney(product.basePrice, product.currency, locale)}</span><Link href={`/${locale}/product/${product.slug}`}>{t.common.viewProduct}</Link></div>
    </div>
  </article>;
}
