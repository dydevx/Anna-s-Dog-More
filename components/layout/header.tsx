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

const languages = {
  de: { flag: "de", code: "DE", name: "Deutsch" },
  en: { flag: "gb", code: "EN", name: "English" },
} as const;

function LanguageSwitcher({ locale, pathname, mobile = false }: { locale: Locale; pathname: string; mobile?: boolean }) {
  return <div className={`language-switcher${mobile ? " drawer-language-switcher" : ""}`} role="group" aria-label={locale === "de" ? "Sprache wählen" : "Choose language"}>
    {(Object.keys(languages) as Locale[]).map((language) => {
      const item = languages[language];
      const href = pathname.replace(/^\/(de|en)(?=\/|$)/, `/${language}`);
      return <Link key={language} className="language-option" data-active={locale === language} href={href} hrefLang={language} aria-current={locale === language ? "page" : undefined} aria-label={item.name} title={item.name}>
        <span className="language-flag" data-flag={item.flag} aria-hidden="true" /><span className="language-code">{item.code}</span>
      </Link>;
    })}
  </div>;
}

export function Header({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [settledQuery, setSettledQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searching = query.trim().length >= 2 && settledQuery !== query;

  useEffect(() => {
    if (!searchOpen) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setSearchOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOverlay);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOverlay);
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (response.ok) setResults(await response.json());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSettledQuery(query);
      }
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
          <button className="icon-button mobile-only" type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><List size={23} /></button>
          <Link className="wordmark" href={`/${locale}`} aria-label="Anna's Dog & More home">
            <span>ANNA&apos;S</span><small>DOG & MORE</small>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button desktop-action" type="button" aria-label={t.nav.search} aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><MagnifyingGlass size={21} /></button>
            <Link className="icon-button desktop-action" href={`/${locale}/account`} aria-label={t.nav.account}><UserCircle size={22} /></Link>
            <LanguageSwitcher locale={locale} pathname={pathname} />
            <Link className="icon-button cart-button" href={`/${locale}/cart`} aria-label={`${t.nav.cart}: ${count}`}>
              <ShoppingBag size={22} /><span className="cart-count" aria-hidden="true">{count}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="drawer-layer" data-state={menuOpen ? "open" : "closed"} role="presentation" inert={!menuOpen} onMouseDown={() => setMenuOpen(false)}>
        <nav className="mobile-drawer" data-state={menuOpen ? "open" : "closed"} aria-label="Mobile navigation" aria-hidden={!menuOpen} onMouseDown={(event) => event.stopPropagation()}>
          <div className="drawer-heading"><span className="wordmark compact"><span>ANNA&apos;S</span><small>DOG & MORE</small></span><button className="icon-button" type="button" onClick={() => setMenuOpen(false)} aria-label={t.common.close}><X size={22} /></button></div>
          {nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
          <button className="mobile-search-link" type="button" onClick={() => { setMenuOpen(false); setSearchOpen(true); }}><MagnifyingGlass size={19} />{t.nav.search}</button>
          <Link href={`/${locale}/account`} onClick={() => setMenuOpen(false)}>{t.nav.account}</Link>
          <LanguageSwitcher locale={locale} pathname={pathname} mobile />
        </nav>
      </div>

      <div className="search-layer" data-state={searchOpen ? "open" : "closed"} role="dialog" aria-modal="true" aria-label={t.nav.search} aria-hidden={!searchOpen} inert={!searchOpen}>
        <div className="search-panel" data-state={searchOpen ? "open" : "closed"}>
          <div className="search-line"><MagnifyingGlass size={24} /><input ref={searchRef} value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) { setResults([]); setSettledQuery(value); } }} placeholder={locale === "de" ? "Produkt oder Art.-Nr. suchen" : "Search product or article number"} aria-label={t.nav.search} /><button className="icon-button" type="button" onClick={() => setSearchOpen(false)} aria-label={t.common.close}><X size={22} /></button></div>
          <div className="search-results" aria-live="polite" aria-busy={searching}>
            {searching && <div className="search-loading" aria-label={locale === "de" ? "Suche läuft" : "Searching"}>{[0, 1, 2].map((item) => <span key={item} />)}</div>}
            {!searching && results.map((product) => <Link key={product.id} href={`/${locale}/product/${product.slug}`} onClick={() => setSearchOpen(false)}>
              <Image src={product.images[0].url} alt={product.images[0].alt[locale]} width={72} height={72} />
              <span><strong>{product.name[locale]}</strong><small>{formatMoney(product.basePrice, product.currency, locale)}</small></span>
            </Link>)}
            {!searching && query.trim().length >= 2 && results.length === 0 && <p>{locale === "de" ? "Keine passenden Produkte gefunden." : "No matching products found."}</p>}
          </div>
        </div>
        <button className="search-backdrop" type="button" aria-label={t.common.close} onClick={() => setSearchOpen(false)} />
      </div>
    </>
  );
}
