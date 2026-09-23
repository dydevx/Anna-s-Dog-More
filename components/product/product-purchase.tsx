"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale, Product } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductPurchase({ product, locale }: { product: Product; locale: Locale }) {
  const t = getDictionary(locale);
  const purchasable = product.variants.filter((variant) => variant.active && variant.price !== null);
  const [selectedId, setSelectedId] = useState(purchasable.length === 1 ? purchasable[0].id : "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addLine } = useCart();
  const selected = useMemo(() => purchasable.find((variant) => variant.id === selectedId), [purchasable, selectedId]);

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
    {product.variants.length > 1 && <fieldset className="variant-fieldset"><legend>{locale === "de" ? "Ausführung wählen" : "Choose a configuration"}</legend>
      <div className="variant-list">
        {product.variants.map((variant) => {
          const enabled = variant.active && variant.price !== null && variant.stockQuantity > 0;
          const label = Object.values(variant.options).join(" / ");
          return <label key={variant.id} className={`variant-option ${selectedId === variant.id ? "selected" : ""} ${!enabled ? "disabled" : ""}`}>
            <input type="radio" name="variant" value={variant.id} checked={selectedId === variant.id} onChange={() => setSelectedId(variant.id)} disabled={!enabled} />
            <span>{label}</span><small>{enabled ? formatMoney(variant.price!, variant.currency, locale) : t.common.unavailable}</small>
          </label>;
        })}
      </div>
    </fieldset>}
    <div className="selected-sku"><span>{t.product.sku}</span><strong>{selected?.sku ?? product.variants[0]?.sku ?? "-"}</strong><span className={selected && selected.stockQuantity > 0 ? "stock-ok" : "stock-off"}>{selected && selected.stockQuantity > 0 ? `${t.product.stock} (${selected.stockQuantity})` : t.product.outOfStock}</span></div>
    <div className="purchase-actions">
      <div className="quantity-control" aria-label={t.common.quantity}><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(selected?.stockQuantity ?? 1, value + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div>
      <button className="button primary-button add-button" type="button" onClick={add} disabled={!selected || selected.stockQuantity < 1}>{added ? <><Check size={18} />{locale === "de" ? "Hinzugefügt" : "Added"}</> : (selected ? t.common.addToCart : t.common.unavailable)}</button>
    </div>
    {!selected && <p className="availability-note">{product.variants.some((variant) => variant.price === null) ? (locale === "de" ? "Die variantengenauen Verkaufspreise müssen vor der Freischaltung bestätigt werden." : "Per-variant retail prices must be confirmed before this item can be enabled.") : t.product.selectOptions}</p>}
  </div>;
}
