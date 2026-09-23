import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";

const pages = {
  returns: {
    de: { title: "14 Tage Rückgaberecht", intro: "Für Bestellungen gilt eine Rückgabefrist von 14 Tagen.", sections: [["Frist", "Die Frist beträgt 14 Tage. Der genaue Beginn der Frist muss in den finalen, rechtlich geprüften Bedingungen ergänzt werden."], ["Rückgabeprozess", "Kontaktweg, Rücksendeadresse und erforderliche Bestellangaben werden vom Shop vor Veröffentlichung bestätigt."], ["Zustand der Ware", "Verbindliche Anforderungen an Zustand, Verpackung und Ausnahmen wurden noch nicht bereitgestellt."], ["Erstattung", "Zahlungsweg, Bearbeitungszeit und mögliche Abzüge müssen rechtlich geprüft und ergänzt werden."], ["Rücksendekosten", "Es wurde noch nicht bestätigt, wer die Rücksendekosten trägt."]] },
    en: { title: "14-day return period", intro: "Orders have a 14-day return period.", sections: [["Deadline", "The period is 14 days. The exact start of the period must be added to the final legally reviewed terms."], ["Return process", "The contact route, return address and required order details will be confirmed by the shop before publication."], ["Condition", "Binding requirements for product condition, packaging and exclusions have not yet been provided."], ["Refund", "The payment route, processing time and possible deductions require legal review and confirmation."], ["Return shipping", "Responsibility for return shipping costs has not yet been confirmed."]] },
  },
  shipping: {
    de: { title: "Versand", intro: "Versandarten und Gebühren werden im Checkout aus der aktuellen Shop-Konfiguration geladen.", sections: [["Liefergebiete", "Die final freigegebenen Länder werden vom Shop im Admin-Bereich gepflegt."], ["Gebühren", "Es werden keine pauschalen Gebühren veröffentlicht, bevor der Shop diese bestätigt hat."], ["Lieferzeit", "Die geschätzte Lieferzeit wird pro Versandart konfiguriert."]] },
    en: { title: "Shipping", intro: "Shipping methods and fees are loaded from the current shop configuration during checkout.", sections: [["Destinations", "The shop maintains approved destination countries in the administration area."], ["Fees", "No standard fee is published until it has been confirmed by the shop."], ["Delivery estimate", "The estimated delivery time is configured per shipping method."]] },
  },
  payment: {
    de: { title: "Zahlungsarten", intro: "Im Checkout werden nur aktivierte und für Währung und Land verfügbare Zahlungsarten angezeigt.", sections: [["Karten", "Die Architektur unterstützt Visa und Mastercard über den konfigurierten Zahlungsanbieter."], ["TWINT", "TWINT benötigt CHF, eine aktivierte Merchant-Funktion und vollständige rechtliche Shopangaben. Es bleibt deaktiviert, solange diese Voraussetzungen nicht erfüllt sind."], ["Sicherheit", "Anna's Dog & More speichert keine vollständigen Kartennummern, CVV oder Rohkartendaten."]] },
    en: { title: "Payment methods", intro: "Checkout shows only active payment methods available for the selected currency and country.", sections: [["Cards", "The architecture supports Visa and Mastercard through the configured payment provider."], ["TWINT", "TWINT requires CHF, an enabled merchant capability and complete legal store information. It remains disabled until these requirements are met."], ["Security", "Anna's Dog & More never stores full card numbers, CVV or raw card data."]] },
  },
  imprint: {
    de: { title: "Impressum", intro: "Vorlage zur rechtlichen Prüfung", sections: [["Anschrift", "Anna's Dog & More, Leimbachstrasse 200, 8041 Zürich, Switzerland"], ["Unternehmensangaben", "Rechtsform, vertretungsberechtigte Person, E-Mail, Telefon und Registerangaben müssen vom Shop ergänzt und rechtlich geprüft werden."]] },
    en: { title: "Legal notice", intro: "Draft structure for legal review", sections: [["Address", "Anna's Dog & More, Leimbachstrasse 200, 8041 Zürich, Switzerland"], ["Company details", "Legal entity, authorised representative, email, phone and registration details must be provided by the shop and legally reviewed."]] },
  },
  privacy: {
    de: { title: "Datenschutz", intro: "Entwurf, nicht rechtlich freigegeben", sections: [["Offene Angaben", "Verantwortliche Stelle, eingesetzte Anbieter, Aufbewahrungsfristen, Betroffenenrechte, Cookies und Analysewerkzeuge müssen nach finaler Provider-Auswahl ergänzt werden."]] },
    en: { title: "Privacy", intro: "Draft, not legally approved", sections: [["Details required", "The controller, providers, retention periods, data subject rights, cookies and analytics tools must be completed after the final provider selection."]] },
  },
  terms: {
    de: { title: "Allgemeine Geschäftsbedingungen", intro: "Strukturplatzhalter zur rechtlichen Prüfung", sections: [["Noch nicht veröffentlicht", "Vertragsschluss, Preise, Lieferung, Gewährleistung, Haftung, Rückgabe und anwendbares Recht müssen vom Shop und einer qualifizierten Rechtsberatung finalisiert werden."]] },
    en: { title: "Terms and conditions", intro: "Structural placeholder for legal review", sections: [["Not yet published", "Contract formation, prices, delivery, warranty, liability, returns and governing law must be finalised by the shop with qualified legal counsel."]] },
  },
} as const;

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !(slug in pages)) notFound();
  const page = pages[slug as keyof typeof pages][locale];
  return <article className="legal-page"><header><p>{locale === "de" ? "Rechtliche Information" : "Legal information"}</p><h1>{page.title}</h1><span>{page.intro}</span></header><div className="legal-warning">{locale === "de" ? "Dieser Inhalt ist, soweit ausdrücklich markiert, ein administrierbarer Entwurf und keine Bestätigung anwaltlicher Prüfung." : "Where explicitly marked, this content is an editable draft and does not claim legal approval."}</div>{page.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}</article>;
}
