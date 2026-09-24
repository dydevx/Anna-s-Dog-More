import { Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { isLocale } from "@/lib/i18n/config";
import { ContactForm } from "@/components/contact/contact-form";
import { OPENING_HOURS, STORE, localizeHours } from "@/lib/store";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const de = locale === "de";
  return <div className="page-shell contact-page"><header className="page-intro"><h1>{de ? "Besuchen Sie uns in Zürich." : "Visit us in Zurich."}</h1><p>{de ? "Für Produktberatung, Varianten und Verfügbarkeit helfen wir gerne persönlich weiter." : "We are happy to help in person with product advice, variants and availability."}</p></header><section className="contact-grid"><article className="contact-address"><MapPin size={27} weight="light" /><h2>Anna&apos;s Dog & More</h2><address>{STORE.street}<br />{STORE.postalCode} {STORE.city}<br />{STORE.country}</address></article><article className="contact-hours"><Clock size={27} weight="light" /><h2>{de ? "Öffnungszeiten" : "Opening hours"}</h2><dl>{OPENING_HOURS.map((entry) => <div key={entry.day.en}><dt>{entry.day[locale]}</dt><dd>{localizeHours(entry.hours, locale)}</dd></div>)}</dl></article></section><section className="contact-map" aria-label={de ? "Karte" : "Map"}><iframe title={de ? "Karte zu Anna's Dog & More" : "Map to Anna's Dog & More"} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=Leimbachstrasse%20200%2C%208041%20Z%C3%BCrich%2C%20Switzerland&output=embed" /></section><ContactForm locale={locale} /></div>;
}
