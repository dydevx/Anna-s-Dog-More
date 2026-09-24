import Link from "next/link";
import type { Locale } from "@/types/catalog";
import { OPENING_HOURS, STORE, localizeHours } from "@/lib/store";

export function Footer({ locale }: { locale: Locale }) {
  const isDe = locale === "de";
  return <footer className="site-footer">
    <div className="footer-lead">
      <div className="wordmark footer-mark"><span>ANNA&apos;S</span><small>DOG & MORE</small></div>
      <p>{isDe ? "Ausgewählte Produkte für ein gutes Leben mit Hund." : "Selected products for a good life with dogs."}</p>
    </div>
    <div className="footer-columns">
      <div><h2>Shop</h2><Link href={`/${locale}/shop`}>Shop</Link><Link href={`/${locale}/shop#categories`}>{isDe ? "Kategorien" : "Categories"}</Link><Link href={`/${locale}/shop?sort=newest`}>{isDe ? "Neuheiten" : "New arrivals"}</Link><Link href={`/${locale}/shop?featured=true`}>Bestseller</Link></div>
      <div><h2>{isDe ? "Service" : "Service"}</h2><Link href={`/${locale}/contact`}>{isDe ? "Kontakt" : "Contact"}</Link><Link href={`/${locale}/legal/shipping`}>{isDe ? "Versand" : "Shipping"}</Link><Link href={`/${locale}/legal/returns`}>{isDe ? "Rückgabe" : "Returns"}</Link><Link href={`/${locale}/legal/payment`}>{isDe ? "Zahlungsarten" : "Payment methods"}</Link></div>
      <div><h2>{isDe ? "Rechtliches" : "Legal"}</h2><Link href={`/${locale}/legal/imprint`}>Impressum</Link><Link href={`/${locale}/legal/privacy`}>{isDe ? "Datenschutz" : "Privacy"}</Link><Link href={`/${locale}/legal/terms`}>AGB</Link></div>
      <div><h2>{isDe ? "Information" : "Information"}</h2><strong className="footer-store-name">Anna&apos;s Dog & More</strong><address>{STORE.street}<br />{STORE.postalCode} {STORE.city}<br />{STORE.country}</address><span>{isDe ? "Mo-Fr" : "Mon-Fri"} {localizeHours(OPENING_HOURS[0].hours, locale)}<br />{isDe ? "Sa" : "Sat"} {localizeHours(OPENING_HOURS[5].hours, locale)}<br />{isDe ? "So Geschlossen" : "Sun Closed"}</span></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Anna&apos;s Dog & More. {isDe ? "Alle Rechte vorbehalten." : "All rights reserved."}</span><span>{isDe ? "Gestaltet von" : "Designed by"} <strong>HoangCaster</strong></span></div>
  </footer>;
}
