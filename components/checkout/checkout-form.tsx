"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LockKey, WarningCircle } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

type ShippingMethod = { id: string; name: string; estimate?: string | null; fee: number; currency: string };
type AddressState = { firstName: string; lastName: string; street: string; houseNumber: string; postalCode: string; city: string; country: string };
const emptyAddress: AddressState = { firstName: "", lastName: "", street: "", houseNumber: "", postalCode: "", city: "", country: "CH" };

export function CheckoutForm({ locale, paymentCancelled }: { locale: Locale; paymentCancelled: boolean }) {
  const t = getDictionary(locale);
  const cart = useCart();
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [methodId, setMethodId] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingChecked, setShippingChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(paymentCancelled ? (locale === "de" ? "Die Zahlung wurde abgebrochen. Ihr Warenkorb bleibt erhalten." : "Payment was cancelled. Your cart is unchanged.") : "");
  const currency = cart.currency ?? "CHF";
  const selectedMethod = methods.find((method) => method.id === methodId);
  const total = cart.subtotal + (selectedMethod?.fee ?? 0);

  useEffect(() => {
    if (!cart.hydrated || cart.lines.length === 0) return;
    const controller = new AbortController();
    fetch(`/api/shipping?country=${address.country}&currency=${currency}&subtotal=${cart.subtotal}&locale=${locale}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<ShippingMethod[]> : [])
      .then((data) => { setMethods(data); setMethodId(data[0]?.id ?? ""); setShippingChecked(true); })
      .catch(() => setMethods([]))
      .finally(() => setShippingLoading(false));
    return () => controller.abort();
  }, [address.country, cart.hydrated, cart.lines.length, cart.subtotal, currency, locale]);

  const fields = useMemo(() => [
    ["firstName", t.checkout.firstName, "given-name"], ["lastName", t.checkout.lastName, "family-name"], ["street", t.checkout.street, "address-line1"], ["houseNumber", t.checkout.houseNumber, "address-line2"], ["postalCode", t.checkout.postalCode, "postal-code"], ["city", t.checkout.city, "address-level2"],
  ] as const, [t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!methodId || submitting) return;
    setSubmitting(true); setError("");
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, email, phone, shippingAddress: address, billingAddress: address, shippingMethodId: methodId, items: cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })) }) });
    const result = await response.json();
    if (response.ok && result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
    const messages: Record<string, string> = {
      SHIPPING_UNAVAILABLE: t.checkout.unavailable,
      OUT_OF_STOCK: locale === "de" ? "Ein Artikel ist nicht mehr in der gewünschten Menge verfügbar." : "An item is no longer available in the requested quantity.",
      STRIPE_NOT_CONFIGURED: locale === "de" ? "Der Zahlungsanbieter ist noch nicht konfiguriert." : "The payment provider is not configured yet.",
      SUPABASE_SERVER_NOT_CONFIGURED: locale === "de" ? "Die Shop-Datenbank ist noch nicht verbunden." : "The shop database is not connected yet.",
    };
    setError(messages[result.error] ?? (locale === "de" ? "Checkout konnte nicht gestartet werden. Bitte versuchen Sie es erneut." : "Checkout could not be started. Please try again."));
    setSubmitting(false);
  }

  if (cart.hydrated && cart.lines.length === 0) return <div className="empty-state"><h1>{t.cart.empty}</h1></div>;
  return <form className="checkout-layout" onSubmit={submit}>
    <section className="checkout-form-section"><header><p>{locale === "de" ? "Gast-Checkout" : "Guest checkout"}</p><h1>{t.checkout.title}</h1></header>{error && <div className="form-alert" role="alert"><WarningCircle size={20} />{error}</div>}<fieldset><legend>{t.checkout.contact}</legend><div className="form-grid"><label className="span-2">{t.checkout.email}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="span-2">{t.checkout.phone}<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div></fieldset><fieldset><legend>{t.checkout.delivery}</legend><div className="form-grid">{fields.map(([key, label, autocomplete]) => <label key={key} className={key === "street" ? "span-1-5" : ""}>{label}<input required autoComplete={autocomplete} value={address[key]} onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label className="span-2">{t.checkout.country}<select value={address.country} onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))}><option value="CH">Switzerland</option><option value="DE">Germany</option><option value="AT">Austria</option></select></label></div></fieldset><fieldset><legend>{t.common.shipping}</legend>{shippingLoading ? <div className="shipping-skeleton" /> : methods.length ? <div className="shipping-options">{methods.map((method) => <label key={method.id}><input type="radio" name="shipping" checked={methodId === method.id} onChange={() => setMethodId(method.id)} /><span><strong>{method.name}</strong><small>{method.estimate}</small></span><b>{formatMoney(method.fee, method.currency, locale)}</b></label>)}</div> : shippingChecked && <div className="configuration-notice"><WarningCircle size={20} /><span>{t.checkout.unavailable}</span></div>}</fieldset><label className="checkbox-line"><input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} />{t.checkout.billingSame}</label>{!billingSame && <div className="configuration-notice"><span>{locale === "de" ? "Eine separate Rechnungsadresse wird nach Aktivierung der finalen Steuerkonfiguration freigeschaltet." : "A separate billing address will be enabled after the final tax configuration is confirmed."}</span></div>}<button className="button primary-button checkout-button" type="submit" disabled={!methodId || submitting || !billingSame}>{submitting ? (locale === "de" ? "Zahlung wird vorbereitet…" : "Preparing payment…") : t.checkout.continue}</button><p className="secure-note"><LockKey size={17} />{t.checkout.secure}</p></section>
    <aside className="checkout-summary"><h2>{locale === "de" ? "Ihre Auswahl" : "Your selection"}</h2>{cart.lines.map((line) => <div className="checkout-line" key={line.id}><span>{line.quantity}×</span><div><strong>{line.name[locale]}</strong><small>{line.variantLabel[locale]}</small></div><b>{formatMoney(line.unitPrice * line.quantity, line.currency, locale)}</b></div>)}<div className="summary-row"><span>{t.common.subtotal}</span><b>{formatMoney(cart.subtotal, currency, locale)}</b></div><div className="summary-row"><span>{t.common.shipping}</span><b>{selectedMethod ? formatMoney(selectedMethod.fee, currency, locale) : "-"}</b></div><div className="summary-total"><span>{t.common.total}</span><strong>{formatMoney(total, currency, locale)}</strong></div></aside>
  </form>;
}
