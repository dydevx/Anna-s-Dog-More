"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale, Product } from "@/types/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductPurchase({ product, locale }: { product: Product; locale: Locale }) {
  const t = getDictionary(locale);
  const purchasable = product.variants.filter((variant) => variant.active && variant.price !== null);
  const [selectedId, setSelectedId] = useState((purchasable[0] ?? product.variants[0])?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addLine } = useCart();
  const configuredVariant = useMemo(() => product.variants.find((variant) => variant.id === selectedId), [product.variants, selectedId]);
  const selected = useMemo(() => purchasable.find((variant) => variant.id === selectedId), [purchasable, selectedId]);
  const optionGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    product.variants.forEach((variant) => Object.entries(variant.options).forEach(([key, value]) => {
      const current = groups.get(key) ?? [];
      if (!current.includes(value)) groups.set(key, [...current, value]);
    }));
    return [...groups.entries()].filter(([, values]) => values.length > 1);
  }, [product.variants]);

  const chooseOption = (key: string, value: string) => {
    const preferred = product.variants.find((variant) => Object.entries(configuredVariant?.options ?? {}).every(([currentKey, currentValue]) => currentKey === key ? variant.options[currentKey] === value : variant.options[currentKey] === currentValue));
    const fallback = product.variants.find((variant) => variant.options[key] === value);
    setSelectedId((preferred ?? fallback ?? configuredVariant)?.id ?? "");
  };

  const add = () => {
    if (!selected || selected.price === null || selected.stockQuantity < quantity) return;
    const optionText = Object.entries(selected.options).map(([key, value]) => `${key}: ${value}`).join(", ");
    addLine({
      id: `${product.id}:${selected.id}`,
      productId: product.id,
      productSlug: product.slug,
      variantId: selected.id,
      sku: selected.sku,
      name: product.name,
      variantLabel: { de: optionText, en: optionText },
      imageUrl: selected.imageUrl ?? product.images[0].url,
      unitPrice: selected.price,
      currency: selected.currency,
      quantity,
      maxQuantity: selected.stockQuantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  return <div className="purchase-panel">
    {optionGroups.map(([key, values]) => <fieldset className="variant-fieldset" key={key}><legend>{t.product[key as keyof typeof t.product] ?? key}</legend><div className="variant-pills">{values.map((value) => <button type="button" key={value} className={configuredVariant?.options[key] === value ? "selected" : ""} aria-pressed={configuredVariant?.options[key] === value} onClick={() => chooseOption(key, value)}>{value}</button>)}</div></fieldset>)}
    <div className="selected-sku"><span>{t.product.sku}</span><strong>{configuredVariant?.sku ?? product.variants[0]?.sku ?? "-"}</strong><span className={selected && selected.stockQuantity > 0 ? "stock-ok" : "stock-off"}>{selected && selected.stockQuantity > 0 ? `${t.product.stock} (${selected.stockQuantity})` : t.product.outOfStock}</span></div>
    <div className="purchase-actions">
      <div className="quantity-control" aria-label={t.common.quantity}><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(selected?.stockQuantity ?? 1, value + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div>
      <button className="button primary-button add-button" type="button" onClick={add} disabled={!selected || selected.stockQuantity < 1}>{added ? <><Check size={18} />{locale === "de" ? "Hinzugefügt" : "Added"}</> : (selected ? t.common.addToCart : t.common.unavailable)}</button>
    </div>
    {!selected && <p className="availability-note">{product.variants.some((variant) => variant.price === null) ? (locale === "de" ? "Die variantengenauen Verkaufspreise müssen vor der Freischaltung bestätigt werden." : "Per-variant retail prices must be confirmed before this item can be enabled.") : t.product.selectOptions}</p>}
  </div>;
}
