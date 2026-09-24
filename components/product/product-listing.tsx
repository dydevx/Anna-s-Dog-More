"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "@phosphor-icons/react";
import { ProductCard } from "@/components/product/product-card";
import type { Category, Locale, Product } from "@/types/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductListing({ products, categories, locale, initialCategory, initialSort, featuredOnly = false }: { products: Product[]; categories: Category[]; locale: Locale; initialCategory?: string; initialSort?: string; featuredOnly?: boolean }) {
  const t = getDictionary(locale);
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState(initialSort === "newest" ? "newest" : "recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const [materials, setMaterials] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);

  const facets = useMemo(() => {
    const values = (key: string) => [...new Set(products.flatMap((product) => {
      const variantValues = product.variants.map((variant) => variant.options[key]).filter(Boolean);
      const attributeValues = product.attributes[key]?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
      return [...variantValues, ...attributeValues];
    }))].toSorted((a, b) => a.localeCompare(b));
    return { materials: [...new Set([...values("material"), ...values("fabric")])], colors: values("color"), sizes: values("size") };
  }, [products]);
  const priceBounds = useMemo(() => ({
    min: Math.floor(Math.min(...products.map((product) => product.basePrice), 0)),
    max: Math.ceil(Math.max(...products.map((product) => product.basePrice), 0)),
  }), [products]);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const activePriceMax = priceMax ?? priceBounds.max;

  useEffect(() => {
    if (!filterOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filterOpen]);

  const visible = useMemo(() => {
    const includesFacet = (product: Product, selected: string[], keys: string[]) => selected.length === 0 || selected.some((wanted) => {
      const values = [
        ...keys.flatMap((key) => product.variants.map((variant) => variant.options[key])),
        ...keys.flatMap((key) => product.attributes[key]?.split(",").map((value) => value.trim()) ?? []),
      ];
      return values.includes(wanted);
    });
    const filtered = products.filter((product) =>
      (category === "all" || product.categorySlug === category)
      && (!featuredOnly || product.featured)
      && product.basePrice <= activePriceMax
      && includesFacet(product, materials, ["material", "fabric"])
      && includesFacet(product, colors, ["color"])
      && includesFacet(product, sizes, ["size"])
      && (!availableOnly || product.variants.some((variant) => variant.active && variant.price !== null && variant.stockQuantity > 0))
    );
    return filtered.toSorted((a, b) => {
      if (sort === "low") return a.basePrice - b.basePrice;
      if (sort === "high") return b.basePrice - a.basePrice;
      if (sort === "name") return a.name[locale].localeCompare(b.name[locale]);
      if (sort === "newest") return Number(b.badge === "new") - Number(a.badge === "new");
      return Number(b.featured) - Number(a.featured);
    });
  }, [activePriceMax, availableOnly, category, colors, featuredOnly, locale, materials, products, sizes, sort]);

  const toggle = (value: string, selected: string[], setSelected: (value: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const facetGroup = (title: string, values: string[], selected: string[], setSelected: (value: string[]) => void) => values.length ? <fieldset><legend>{title}</legend>{values.map((value) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value, selected, setSelected)} />{value}</label>)}</fieldset> : null;

  const filters = <div className="filter-content"><div className="filter-mobile-heading"><strong>{t.shop.filter}</strong><button className="icon-button" onClick={() => setFilterOpen(false)} aria-label={t.common.close}><X size={21} /></button></div><fieldset><legend>{t.nav.categories}</legend><label><input type="radio" name="category" checked={category === "all"} onChange={() => setCategory("all")} />{locale === "de" ? "Alle" : "All"}</label>{categories.map((item) => <label key={item.id}><input type="radio" name="category" checked={category === item.slug} onChange={() => setCategory(item.slug)} />{item.name[locale]}</label>)}</fieldset><fieldset><legend>{t.shop.price}</legend><label className="price-filter"><span>{locale === "de" ? "Bis" : "Up to"} CHF {activePriceMax.toFixed(0)}</span><input type="range" min={priceBounds.min} max={priceBounds.max} step="10" value={activePriceMax} onChange={(event) => setPriceMax(Number(event.target.value))} /></label></fieldset>{facetGroup(t.shop.material, facets.materials, materials, setMaterials)}{facetGroup(t.shop.color, facets.colors, colors, setColors)}{facetGroup(t.shop.size, facets.sizes, sizes, setSizes)}<fieldset><legend>{t.shop.availability}</legend><label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />{t.shop.inStock}</label></fieldset></div>;

  return <div className="listing-shell"><div className="listing-toolbar"><button className="button secondary-button filter-trigger" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={18} />{t.shop.filter}</button><span>{visible.length} {t.common.products.toLocaleLowerCase()}</span><label><span className="sr-only">{t.shop.sort}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{t.shop.recommended}</option><option value="low">{t.shop.lowHigh}</option><option value="high">{t.shop.highLow}</option><option value="name">{t.shop.name}</option><option value="newest">{t.shop.newest}</option></select></label></div><div className="listing-grid"><aside className="filter-sidebar">{filters}</aside><div>{visible.length ? <div className="product-grid listing-products">{visible.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div> : <div className="empty-state compact-empty"><h2>{locale === "de" ? "Keine passenden Produkte" : "No matching products"}</h2><p>{locale === "de" ? "Entfernen Sie einen Filter und versuchen Sie es erneut." : "Remove a filter and try again."}</p></div>}</div></div>{filterOpen && <div className="drawer-layer" onMouseDown={() => setFilterOpen(false)}><aside className="filter-drawer" role="dialog" aria-modal="true" aria-label={t.shop.filter} onMouseDown={(event) => event.stopPropagation()}>{filters}</aside></div>}</div>;
}
