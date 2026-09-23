import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { isLocale } from "@/lib/i18n/config";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  const de = locale === "de";
  return <div className="page-shell contact-page"><header className="page-intro"><h1>{de ? "Besuchen Sie uns in Zürich." : "Visit us in Zurich."}</h1><p>{de ? "Für Produktberatung, Varianten und Verfügbarkeit helfen wir gerne persönlich weiter." : "We are happy to help in person with product advice, variants and availability."}</p></header><section className="contact-grid"><article><MapPin size={27} weight="light" /><h2>Anna&apos;s Dog & More</h2><address>Leimbachstrasse 200<br />8041 Zürich<br />Switzerland</address></article><article><h2>{de ? "Kontaktangaben" : "Contact details"}</h2><p>{de ? "Telefon, E-Mail und Öffnungszeiten wurden noch nicht vom Shop bestätigt. Diese Angaben werden vor dem Produktionsstart hier ergänzt." : "Phone, email and opening hours have not yet been confirmed by the shop. They will be added here before production launch."}</p></article></section></div>;
}
