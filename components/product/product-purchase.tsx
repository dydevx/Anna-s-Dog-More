"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale, Product, ProductVariant } from "@/types/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getOptionGroups, OPTION_ORDER, resolveVariant } from "@/lib/product-variants";

const COLOR_SWATCHES: Record<string, string> = {
  amber: "#b97831",
  anthrazit: "#3f4142",
  "black silk": "#252425",
  creme: "#e8dfcf",
  denim: "#526a7d",
  fango: "#807468",
  gold: "#a98a47",
  graphite: "#4c4b4c",
  green: "#66705b",
  grey: "#8a8782",
  grigio: "#99958e",
  lino: "#c9baa4",
  olive: "#6f7049",
  rose: "#b98783",
  sand: "#c9b394",
  silver: "#aaa9a5",
  stone: "#a69c8f",
  taupe: "#88796d",
};

function variantLabel(variant: ProductVariant, labels: Record<string, string>) {
  return Object.entries(variant.options)
    .filter(([key]) => OPTION_ORDER.includes(key))
    .map(([key, value]) => `${labels[key] ?? key}: ${value}`)
    .join(" · ");
}

export function ProductPurchase({
  product,
  locale,
  selectedId,
  onSelectedIdChange,
}: {
  product: Product;
  locale: Locale;
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
}) {
  const t = getDictionary(locale);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addLine } = useCart();
  const configuredVariant = useMemo(() => product.variants.find((variant) => variant.id === selectedId), [product.variants, selectedId]);
  const selected = configuredVariant?.active && configuredVariant.price !== null ? configuredVariant : undefined;

  const optionGroups = useMemo(() => getOptionGroups(product.variants), [product.variants]);
  const optionKeys = optionGroups.map(([key]) => key);

  const resolveOption = (key: string, value: string) => {
    return resolveVariant(product.variants, configuredVariant, key, value, optionKeys);
  };

  const optionAvailable = (key: string, value: string) => Boolean(resolveOption(key, value));

  const chooseOption = (key: string, value: string) => {
    const next = resolveOption(key, value);
    if (!next) return;
    onSelectedIdChange(next.id);
    setQuantity(1);
    setAdded(false);
  };

  const add = () => {
    if (!selected || selected.price === null || selected.stockQuantity < quantity) return;
    const german = getDictionary("de");
    const english = getDictionary("en");
    const germanLabels = Object.fromEntries(Object.keys(selected.options).map((key) => [key, String(german.product[key as keyof typeof german.product] ?? key)]));
    const englishLabels = Object.fromEntries(Object.keys(selected.options).map((key) => [key, String(english.product[key as keyof typeof english.product] ?? key)]));
    addLine({
      id: `${product.id}:${selected.id}`,
      productId: product.id,
      productSlug: product.slug,
      variantId: selected.id,
      sku: selected.sku,
      articleNumber: selected.articleNumber,
      options: selected.options,
      name: product.name,
      variantLabel: { de: variantLabel(selected, germanLabels), en: variantLabel(selected, englishLabels) },
      imageUrl: selected.imageUrl ?? product.images[0].url,
      unitPrice: selected.price,
      currency: selected.currency,
      quantity,
      maxQuantity: selected.stockQuantity,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const labels = Object.fromEntries(OPTION_ORDER.map((key) => [key, String(t.product[key as keyof typeof t.product] ?? key)]));

  return <div className="purchase-panel">
    {optionGroups.map(([key, values]) => <fieldset className={`variant-fieldset variant-fieldset-${key}`} key={key}>
      <legend>{labels[key]}</legend>
      <div className={key === "color" ? "variant-pills color-pills" : "variant-pills"}>
        {values.map((value) => {
          const active = configuredVariant?.options[key] === value;
          const available = optionAvailable(key, value);
          const swatch = key === "color" ? COLOR_SWATCHES[value.toLocaleLowerCase()] : undefined;
          return <button type="button" key={value} className={active ? "selected" : ""} aria-pressed={active} aria-label={`${labels[key]}: ${value}`} title={value} disabled={!available} onClick={() => chooseOption(key, value)}>
            {swatch && <span className="color-swatch" style={{ "--swatch-color": swatch } as React.CSSProperties} aria-hidden="true">{active && <Check size={12} weight="bold" />}</span>}
            <span>{value}</span>
          </button>;
        })}
      </div>
    </fieldset>)}
    {configuredVariant?.options.color && !configuredVariant.imageUrl && <p className="variant-image-note">{locale === "de" ? "Abbildung kann je nach Variante abweichen." : "Product image may vary by selected variant."}</p>}
    <div className="selected-sku" aria-live="polite">
      <span>{t.product.sku}</span>
      <strong>{configuredVariant?.articleNumber ?? configuredVariant?.sku ?? "-"}</strong>
      <span className={selected && selected.stockQuantity > 0 ? "stock-ok" : "stock-off"}>{selected && selected.stockQuantity > 0 ? `${t.product.stock} (${selected.stockQuantity})` : t.product.outOfStock}</span>
    </div>
    <div className="purchase-actions">
      <div className="quantity-control" aria-label={t.common.quantity}><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={16} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(selected?.stockQuantity ?? 1, value + 1))} aria-label="Increase quantity"><Plus size={16} /></button></div>
      <button className="button primary-button add-button" type="button" onClick={add} disabled={!selected || selected.stockQuantity < 1}>{added ? <><Check size={18} />{locale === "de" ? "Hinzugefügt" : "Added"}</> : (selected ? t.common.addToCart : t.common.unavailable)}</button>
    </div>
    {!selected && <p className="availability-note">{configuredVariant?.price === null ? (locale === "de" ? "Fehlende Quelldaten: Der Variantenpreis muss noch bestätigt werden." : "Missing source data: this variant price still needs confirmation.") : t.product.selectOptions}</p>}
  </div>;
}
