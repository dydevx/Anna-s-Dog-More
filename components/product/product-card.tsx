import Image from "next/image";
import Link from "next/link";
import type { Locale, Product } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductCard({ product, locale, priority = false }: { product: Product; locale: Locale; priority?: boolean }) {
  const t = getDictionary(locale);
  const pricedVariants = product.variants.filter((variant) => variant.active && variant.price !== null);
  const from = product.productType === "configurable" || product.variants.length > 1 || product.variants.some((variant) => variant.price === null);
  const soldOut = pricedVariants.every((variant) => variant.stockQuantity < 1);
  return <article className="product-card">
    <Link className="product-image" href={`/${locale}/product/${product.slug}`}>
      <Image src={product.images[0].url} alt={product.images[0].alt[locale]} fill sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw" priority={priority} />
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
