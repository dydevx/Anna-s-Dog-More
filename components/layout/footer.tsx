import Link from "next/link";
import { ArrowUpRight, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/types/catalog";
import { OPENING_HOURS, STORE, localizeHours } from "@/lib/store";

export function Footer({ locale }: { locale: Locale }) {
  const isDe = locale === "de";
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${STORE.street}, ${STORE.postalCode} ${STORE.city}, ${STORE.country}`)}`;

  return <footer className="site-footer">
    <div className="footer-frame">
      <div className="footer-lead">
        <Link className="wordmark footer-mark" href={`/${locale}`} aria-label={`Anna's Dog & More ${isDe ? "Startseite" : "home"}`}><span>ANNA&apos;S</span><small>DOG & MORE</small></Link>
        <div className="footer-statement">
          <h2>{isDe ? "Ausgewählte Produkte für ein gutes Leben mit Hund." : "Selected products for a good life with dogs."}</h2>
          <Link className="footer-primary-link" href={`/${locale}/contact`}>{isDe ? "Kontakt & Beratung" : "Contact & advice"}<ArrowUpRight size={18} weight="bold" aria-hidden="true" /></Link>
        </div>
      </div>

      <div className="footer-directory">
        <nav className="footer-columns" aria-label={isDe ? "Fußzeilennavigation" : "Footer navigation"}>
          <div className="footer-link-group"><h2>Shop</h2><Link href={`/${locale}/shop`}>Shop</Link><Link href={`/${locale}/shop#categories`}>{isDe ? "Kategorien" : "Categories"}</Link><Link href={`/${locale}/shop?sort=newest`}>{isDe ? "Neuheiten" : "New arrivals"}</Link><Link href={`/${locale}/shop?featured=true`}>Bestseller</Link></div>
          <div className="footer-link-group"><h2>Service</h2><Link href={`/${locale}/contact`}>{isDe ? "Kontakt" : "Contact"}</Link><Link href={`/${locale}/legal/shipping`}>{isDe ? "Versand" : "Shipping"}</Link><Link href={`/${locale}/legal/returns`}>{isDe ? "Rückgabe" : "Returns"}</Link><Link href={`/${locale}/legal/payment`}>{isDe ? "Zahlungsarten" : "Payment methods"}</Link></div>
          <div className="footer-link-group"><h2>{isDe ? "Rechtliches" : "Legal"}</h2><Link href={`/${locale}/legal/imprint`}>Impressum</Link><Link href={`/${locale}/legal/privacy`}>{isDe ? "Datenschutz" : "Privacy"}</Link><Link href={`/${locale}/legal/terms`}>AGB</Link></div>
        </nav>

        <section className="footer-store" aria-labelledby="footer-store-heading">
          <div className="footer-store-heading"><MapPin size={22} weight="light" aria-hidden="true" /><h2 id="footer-store-heading">{isDe ? "Besuchen Sie uns" : "Visit us"}</h2></div>
          <strong>Anna&apos;s Dog & More</strong>
          <a className="footer-address" href={mapHref} target="_blank" rel="noreferrer">
            <address>{STORE.street}<br />{STORE.postalCode} {STORE.city}<br />{STORE.country}</address>
            <span>{isDe ? "Auf Karte ansehen" : "View on map"}<ArrowUpRight size={15} weight="bold" aria-hidden="true" /></span>
          </a>
          <div className="footer-hours">
            <Clock size={19} weight="light" aria-hidden="true" />
            <dl>
              <div><dt>{isDe ? "Mo-Fr" : "Mon-Fri"}</dt><dd>{localizeHours(OPENING_HOURS[0].hours, locale)}</dd></div>
              <div><dt>{isDe ? "Sa" : "Sat"}</dt><dd>{localizeHours(OPENING_HOURS[5].hours, locale)}</dd></div>
              <div><dt>{isDe ? "So" : "Sun"}</dt><dd>{localizeHours(OPENING_HOURS[6].hours, locale)}</dd></div>
            </dl>
          </div>
        </section>
      </div>

      <div className="footer-bottom"><span>© 2026 Anna&apos;s Dog & More. {isDe ? "Alle Rechte vorbehalten." : "All rights reserved."}</span><span>{isDe ? "Gestaltet von" : "Designed by"} <strong>HoangCaster</strong></span></div>
    </div>
  </footer>;
}
