"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "@phosphor-icons/react";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/money";
import type { Locale, Product, ProductImage } from "@/types/catalog";

export function ProductDetail({ product, locale }: { product: Product; locale: Locale }) {
  const initialVariant = product.variants.find((variant) => variant.active && variant.price !== null) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState(initialVariant?.id ?? "");
  const selected = product.variants.find((variant) => variant.id === selectedId) ?? initialVariant;
  const t = getDictionary(locale);

  const galleryImages = useMemo(() => {
    if (!selected) return product.images;
    const mapped = product.images.filter((image) => image.variantId === selected.id || (image.color && image.color === selected.options.color));
    const shared = product.images.filter((image) => !image.variantId && !image.color);
    const images = mapped.length > 0 ? [...mapped, ...shared] : [...shared];
    if (selected.imageUrl && !images.some((image) => image.url === selected.imageUrl)) {
      const variantImage: ProductImage = {
        id: `variant-${selected.id}`,
        url: selected.imageUrl,
        alt: {
          de: `${product.name.de}${selected.options.color ? ` – ${selected.options.color}` : ""}`,
          en: `${product.name.en}${selected.options.color ? ` – ${selected.options.color}` : ""}`,
        },
        sortOrder: -1,
        variantId: selected.id,
        color: selected.options.color,
        isPrimary: true,
      };
      return [variantImage, ...images];
    }
    return images.length > 0 ? images : product.images;
  }, [product, selected]);

  const price = selected?.price;
  const priceLabel = price === null || price === undefined
    ? (locale === "de" ? "Preis wird bestätigt" : "Price to be confirmed")
    : formatMoney(price, selected.currency, locale);

  return <div className="product-detail">
    <ProductGallery key={`${selectedId}:${galleryImages[0]?.id ?? "gallery"}`} images={galleryImages} locale={locale} />
    <section className="product-info">
      <p className="product-brand">LABONI</p>
      <h1>{product.name[locale]}</h1>
      <p className="product-price" aria-live="polite">{priceLabel}</p>
      <p className="tax-note">{locale === "de" ? "Versandkosten werden im Checkout berechnet." : "Shipping is calculated at checkout."}</p>
      <p className="product-lede">{product.shortDescription[locale]}</p>
      <ProductPurchase product={product} locale={locale} selectedId={selectedId} onSelectedIdChange={setSelectedId} />
      <div className="source-note"><ShieldCheck size={20} /><span>{t.product.verified}</span></div>
    </section>
  </div>;
}
