import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { STORE } from "@/lib/store";

const pages = {
  returns: {
    de: { title: "Rückgabe & Erstattung", intro: "Informationen zu Rückgabe, Rücksendung und Erstattung.", sections: [["Rückgabefrist", "Eine Rückgabe ist innerhalb von 14 Tagen nach Erhalt der Bestellung möglich."], ["Rückgabeprozess", "Bitte kontaktiere uns vor der Rücksendung. Anschliessend erhältst du die Rücksendeadresse und alle notwendigen Informationen zur Rückgabe."], ["Zustand der Ware", "Die Ware muss unbenutzt, sauber und unbeschädigt sein und sich möglichst in der Originalverpackung befinden. Bereits benutzte oder aus hygienischen Gründen nicht mehr verkäufliche Artikel sind von der freiwilligen Rückgabe ausgeschlossen."], ["Rücksendekosten", "Die Kosten der Rücksendung trägt der Kunde. Bei einer berechtigten Reklamation aufgrund eines mangelhaften oder falsch gelieferten Artikels übernehmen wir die Rücksendekosten."], ["Rückerstattung", "Nach Eingang und Prüfung der Rücksendung wird der erstattungsfähige Betrag innerhalb von 7 Werktagen über die ursprünglich verwendete Zahlungsmethode zurückerstattet. Je nach Bank oder Zahlungsanbieter kann es anschliessend noch einige Tage dauern, bis die Rückerstattung auf dem Konto sichtbar ist."]] },
    en: { title: "Returns & refunds", intro: "Information about returns, return shipping and refunds.", sections: [["Return period", "Items may be returned within 14 days of receiving the order."], ["Return process", "Please contact us before returning an item. We will then provide the return address and all the information you need to complete the return."], ["Condition of the items", "Items must be unused, clean and undamaged and, where possible, in their original packaging. Items that have already been used or can no longer be sold for hygiene reasons are excluded from our voluntary return policy."], ["Return shipping costs", "The customer is responsible for return shipping costs. If a justified complaint concerns a defective or incorrectly delivered item, we will cover the return shipping costs."], ["Refund", "Once we have received and inspected the return, the refundable amount will be refunded to the original payment method within 7 working days. Depending on your bank or payment provider, it may take a few additional days for the refund to appear in your account."]] },
  },
  shipping: {
    de: { title: "Versand & Lieferung", intro: "Informationen zu Liefergebiet, Versandkosten und Lieferzeit.", sections: [["Liefergebiet", "Wir liefern innerhalb der Schweiz."], ["Versandkosten", "Die Versandkosten betragen CHF 7.– pro Bestellung. Ab CHF 50.– Bestellwert ist der Versand kostenlos."], ["Lieferzeit", "Die voraussichtliche Lieferzeit beträgt 2–5 Werktage, sofern der Artikel an Lager ist. Sollte ein Artikel nicht verfügbar sein, informieren wir dich über die voraussichtliche Lieferzeit."]] },
    en: { title: "Shipping & delivery", intro: "Information about delivery areas, shipping costs and delivery times.", sections: [["Delivery area", "We deliver within Switzerland."], ["Shipping costs", "Shipping costs are CHF 7 per order. Shipping is free for orders of CHF 50 or more."], ["Delivery time", "The estimated delivery time is 2–5 working days, provided the item is in stock. If an item is unavailable, we will let you know the estimated delivery time."]] },
  },
  payment: {
    de: { title: "Zahlungsarten", intro: "Im Checkout werden nur aktivierte und für Währung und Land verfügbare Zahlungsarten angezeigt.", sections: [["Karten", "Die Architektur unterstützt Visa und Mastercard über den konfigurierten Zahlungsanbieter."], ["TWINT", "TWINT benötigt CHF, eine aktivierte Merchant-Funktion und vollständige rechtliche Shopangaben. Es bleibt deaktiviert, solange diese Voraussetzungen nicht erfüllt sind."], ["Sicherheit", "Anna's Dog & More speichert keine vollständigen Kartennummern, CVV oder Rohkartendaten."]] },
    en: { title: "Payment methods", intro: "Checkout shows only active payment methods available for the selected currency and country.", sections: [["Cards", "The architecture supports Visa and Mastercard through the configured payment provider."], ["TWINT", "TWINT requires CHF, an enabled merchant capability and complete legal store information. It remains disabled until these requirements are met."], ["Security", "Anna's Dog & More never stores full card numbers, CVV or raw card data."]] },
  },
  imprint: {
    de: { title: "Impressum", intro: "Vorlage zur rechtlichen Prüfung", sections: [["Anschrift", `${STORE.name}, ${STORE.street}, ${STORE.postalCode} ${STORE.city}, ${STORE.country}`], ["Kontakt", `Telefon: ${STORE.phone} · E-Mail: ${STORE.email}`], ["Unternehmensangaben", "Rechtsform, vertretungsberechtigte Person und Registerangaben müssen vom Shop ergänzt und rechtlich geprüft werden."]] },
    en: { title: "Legal notice", intro: "Draft structure for legal review", sections: [["Address", `${STORE.name}, ${STORE.street}, ${STORE.postalCode} ${STORE.city}, ${STORE.country}`], ["Contact", `Phone: ${STORE.phone} · Email: ${STORE.email}`], ["Company details", "Legal entity, authorised representative and registration details must be provided by the shop and legally reviewed."]] },
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
  const isDraft = slug !== "shipping" && slug !== "returns";
  return <article className="legal-page"><header><p>{locale === "de" ? "Rechtliche Information" : "Legal information"}</p><h1>{page.title}</h1><span>{page.intro}</span></header>{isDraft && <div className="legal-warning">{locale === "de" ? "Dieser Inhalt ist, soweit ausdrücklich markiert, ein administrierbarer Entwurf und keine Bestätigung anwaltlicher Prüfung." : "Where explicitly marked, this content is an editable draft and does not claim legal approval."}</div>}{page.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}</article>;
}
