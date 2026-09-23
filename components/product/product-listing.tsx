"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "@phosphor-icons/react";
import { ProductCard } from "@/components/product/product-card";
import type { Category, Locale, Product } from "@/types/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function ProductListing({ products, categories, locale, initialCategory }: { products: Product[]; categories: Category[]; locale: Locale; initialCategory?: string }) {
  const t = getDictionary(locale);
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const visible = useMemo(() => {
    const filtered = products.filter((product) => (category === "all" || product.categorySlug === category) && (!availableOnly || product.variants.some((variant) => variant.active && variant.price !== null && variant.stockQuantity > 0)));
    return filtered.toSorted((a, b) => {
      if (sort === "low") return a.basePrice - b.basePrice;
      if (sort === "high") return b.basePrice - a.basePrice;
      if (sort === "name") return a.name[locale].localeCompare(b.name[locale]);
      return Number(b.featured) - Number(a.featured);
    });
  }, [availableOnly, category, locale, products, sort]);

  const filters = <div className="filter-content"><div className="filter-mobile-heading"><strong>{t.shop.filter}</strong><button className="icon-button" onClick={() => setFilterOpen(false)} aria-label={t.common.close}><X size={21} /></button></div><fieldset><legend>{t.nav.categories}</legend><label><input type="radio" name="category" checked={category === "all"} onChange={() => setCategory("all")} />{locale === "de" ? "Alle" : "All"}</label>{categories.map((item) => <label key={item.id}><input type="radio" name="category" checked={category === item.slug} onChange={() => setCategory(item.slug)} />{item.name[locale]}</label>)}</fieldset><fieldset><legend>{t.shop.availability}</legend><label><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />{t.shop.inStock}</label></fieldset></div>;

  return <div className="listing-shell"><div className="listing-toolbar"><button className="button secondary-button filter-trigger" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={18} />{t.shop.filter}</button><span>{visible.length} {t.common.products.toLocaleLowerCase()}</span><label><span className="sr-only">{t.shop.sort}</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">{t.shop.recommended}</option><option value="low">{t.shop.lowHigh}</option><option value="high">{t.shop.highLow}</option><option value="name">{t.shop.name}</option></select></label></div><div className="listing-grid"><aside className="filter-sidebar">{filters}</aside><div>{visible.length ? <div className="product-grid listing-products">{visible.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div> : <div className="empty-state compact-empty"><h2>{locale === "de" ? "Keine passenden Produkte" : "No matching products"}</h2><p>{locale === "de" ? "Entfernen Sie einen Filter und versuchen Sie es erneut." : "Remove a filter and try again."}</p></div>}</div></div>{filterOpen && <div className="drawer-layer" onMouseDown={() => setFilterOpen(false)}><aside className="filter-drawer" onMouseDown={(event) => event.stopPropagation()}>{filters}</aside></div>}</div>;
}
