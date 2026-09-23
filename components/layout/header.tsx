"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { List, MagnifyingGlass, ShoppingBag, UserCircle, X } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale, Product } from "@/types/catalog";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatMoney } from "@/lib/money";

export function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const alternate = locale === "de" ? "en" : "de";
  const alternatePath = pathname.replace(/^\/(de|en)/, `/${alternate}`);

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      if (response.ok) setResults(await response.json());
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const nav = [
    [t.nav.home, `/${locale}`],
    [t.nav.shop, `/${locale}/shop`],
    [t.nav.categories, `/${locale}/shop#categories`],
    [t.nav.about, `/${locale}/about`],
    [t.nav.contact, `/${locale}/contact`],
  ];

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <button className="icon-button mobile-only" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><List size={23} /></button>
          <Link className="wordmark" href={`/${locale}`} aria-label="Anna's Dog & More home">
            <span>ANNA&apos;S</span><small>DOG & MORE</small>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button desktop-action" type="button" aria-label={t.nav.search} onClick={() => setSearchOpen(true)}><MagnifyingGlass size={21} /></button>
            <Link className="icon-button desktop-action" href={`/${locale}/account`} aria-label={t.nav.account}><UserCircle size={22} /></Link>
            <Link className="locale-switch" href={alternatePath} hrefLang={alternate} aria-label={`Switch to ${alternate.toUpperCase()}`}>{locale.toUpperCase()} <span>/</span> {alternate.toUpperCase()}</Link>
            <Link className="icon-button cart-button" href={`/${locale}/cart`} aria-label={`${t.nav.cart}: ${count}`}>
              <ShoppingBag size={22} /><span className="cart-count" aria-hidden="true">{count}</span>
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && <div className="drawer-layer" role="presentation" onMouseDown={() => setMenuOpen(false)}>
        <nav className="mobile-drawer" aria-label="Mobile navigation" onMouseDown={(event) => event.stopPropagation()}>
          <div className="drawer-heading"><span className="wordmark compact"><span>ANNA&apos;S</span><small>DOG & MORE</small></span><button className="icon-button" type="button" onClick={() => setMenuOpen(false)} aria-label={t.common.close}><X size={22} /></button></div>
          {nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          <Link href={`/${locale}/account`} onClick={() => setMenuOpen(false)}>{t.nav.account}</Link>
          <Link href={alternatePath}>{alternate.toUpperCase()}</Link>
        </nav>
      </div>}

      {searchOpen && <div className="search-layer" role="dialog" aria-modal="true" aria-label={t.nav.search}>
        <div className="search-panel">
          <div className="search-line"><MagnifyingGlass size={24} /><input ref={searchRef} value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) setResults([]); }} placeholder={locale === "de" ? "Produkt oder Art.-Nr. suchen" : "Search product or article number"} aria-label={t.nav.search} /><button className="icon-button" type="button" onClick={() => setSearchOpen(false)} aria-label={t.common.close}><X size={22} /></button></div>
          <div className="search-results" aria-live="polite">
            {results.map((product) => <Link key={product.id} href={`/${locale}/product/${product.slug}`} onClick={() => setSearchOpen(false)}>
              <Image src={product.images[0].url} alt={product.images[0].alt[locale]} width={72} height={72} />
              <span><strong>{product.name[locale]}</strong><small>{formatMoney(product.basePrice, product.currency, locale)}</small></span>
            </Link>)}
            {query.length >= 2 && results.length === 0 && <p>{locale === "de" ? "Keine passenden Produkte gefunden." : "No matching products found."}</p>}
          </div>
        </div>
        <button className="search-backdrop" type="button" aria-label={t.common.close} onClick={() => setSearchOpen(false)} />
      </div>}
    </>
  );
}
