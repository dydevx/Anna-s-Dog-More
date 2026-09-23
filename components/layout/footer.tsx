import Link from "next/link";
import type { Locale } from "@/types/catalog";

export function Footer({ locale }: { locale: Locale }) {
  const isDe = locale === "de";
  return <footer className="site-footer">
    <div className="footer-lead">
      <div className="wordmark footer-mark"><span>ANNA&apos;S</span><small>DOG & MORE</small></div>
      <p>{isDe ? "Ausgewählte Produkte für ein gutes Leben mit Hund." : "Selected products for a good life with dogs."}</p>
    </div>
    <div className="footer-columns">
      <div><h2>Shop</h2><Link href={`/${locale}/shop`}>{isDe ? "Kategorien" : "Categories"}</Link><Link href={`/${locale}/shop?sort=newest`}>{isDe ? "Neuheiten" : "New arrivals"}</Link><Link href={`/${locale}/shop?featured=true`}>Bestseller</Link></div>
      <div><h2>{isDe ? "Service" : "Service"}</h2><Link href={`/${locale}/contact`}>{isDe ? "Kontakt" : "Contact"}</Link><Link href={`/${locale}/legal/shipping`}>{isDe ? "Versand" : "Shipping"}</Link><Link href={`/${locale}/legal/returns`}>{isDe ? "Rückgabe" : "Returns"}</Link><Link href={`/${locale}/legal/payment`}>{isDe ? "Zahlungsarten" : "Payment methods"}</Link></div>
      <div><h2>{isDe ? "Rechtliches" : "Legal"}</h2><Link href={`/${locale}/legal/imprint`}>Impressum</Link><Link href={`/${locale}/legal/privacy`}>{isDe ? "Datenschutz" : "Privacy"}</Link><Link href={`/${locale}/legal/terms`}>AGB</Link></div>
      <div><h2>Anna&apos;s Dog & More</h2><address>Leimbachstrasse 200<br />8041 Zürich<br />Switzerland</address><Link href={locale === "de" ? `/en` : `/de`}>{locale === "de" ? "English" : "Deutsch"}</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Anna&apos;s Dog & More</span><span>{isDe ? "LABONI Auswahl in Zürich" : "LABONI selection in Zurich"}</span></div>
  </footer>;
}
