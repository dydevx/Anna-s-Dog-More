"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LockKey, WarningCircle } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

type ShippingMethod = { id: string; name: string; estimate?: string | null; fee: number; currency: string };
type Salutation = "" | "herr" | "frau" | "divers";
type AddressState = {
  salutation: Salutation;
  company: string;
  firstName: string;
  lastName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
};

const emptyAddress: AddressState = {
  salutation: "",
  company: "",
  firstName: "",
  lastName: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "CH",
};

function SalutationField({ locale, value, autoComplete, onChange }: { locale: Locale; value: Salutation; autoComplete: string; onChange: (value: Salutation) => void }) {
  const de = locale === "de";
  return (
    <label className="span-2">
      {de ? "Anrede (optional)" : "Salutation (optional)"}
      <select autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value as Salutation)}>
        <option value="">{de ? "Keine" : "None"}</option>
        <option value="herr">{de ? "Herr" : "Mr"}</option>
        <option value="frau">{de ? "Frau" : "Ms"}</option>
        <option value="divers">{de ? "Divers" : "Other"}</option>
      </select>
    </label>
  );
}

export function CheckoutForm({ locale, paymentCancelled }: { locale: Locale; paymentCancelled: boolean }) {
  const t = getDictionary(locale);
  const cart = useCart();
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressState>(emptyAddress);
  const checkoutAttempt = useRef<{ payload: string; key: string } | null>(null);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [methodId, setMethodId] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingChecked, setShippingChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(paymentCancelled ? (locale === "de" ? "Die Bestellung wurde abgebrochen. Ihr Warenkorb bleibt erhalten." : "The order was cancelled. Your cart is unchanged.") : "");
  const currency = cart.currency ?? "CHF";
  const selectedMethod = methods.find((method) => method.id === methodId);
  const total = cart.subtotal + (selectedMethod?.fee ?? 0);

  useEffect(() => {
    if (!cart.hydrated || cart.lines.length === 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setShippingLoading(true);
      setShippingChecked(false);
      setMethods([]);
      setMethodId("");
    }, 0);
    fetch(`/api/shipping?country=${address.country}&currency=${currency}&subtotal=${cart.subtotal}&locale=${locale}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<ShippingMethod[]> : [])
      .then((data) => {
        if (!controller.signal.aborted) {
          setMethods(data);
          setMethodId(data[0]?.id ?? "");
          setShippingChecked(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMethods([]);
          setShippingChecked(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          window.clearTimeout(timer);
          setShippingLoading(false);
        }
      });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address.country, cart.hydrated, cart.lines.length, cart.subtotal, currency, locale]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!methodId || shippingLoading || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const details = {
        locale,
        email,
        phone,
        shippingAddress: address,
        billingAddress: billingSame ? address : billingAddress,
        shippingMethodId: methodId,
        items: cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      };
      const payload = JSON.stringify(details);
      if (checkoutAttempt.current?.payload !== payload) checkoutAttempt.current = { payload, key: crypto.randomUUID() };
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ ...details, checkoutKey: checkoutAttempt.current.key }),
      });
      const result = await response.json();
      if (response.ok && result.redirectUrl) {
        try {
          window.sessionStorage.setItem(`annas-checkout:${result.token}`, JSON.stringify(cart.lines.map(({ id, quantity }) => ({ id, quantity }))));
        } catch { /* Checkout still works when browser storage is unavailable. */ }
        window.location.assign(result.redirectUrl);
        return;
      }
      const messages: Record<string, string> = {
        CHECKOUT_EXPIRED: locale === "de" ? "Ihre Bestellung ist abgelaufen. Bitte starten Sie den Checkout erneut." : "Your order expired. Please start checkout again.",
        CHECKOUT_KEY_REUSED: locale === "de" ? "Ihre Angaben haben sich geändert. Bitte starten Sie den Checkout erneut." : "Your details have changed. Please start checkout again.",
        SHIPPING_UNAVAILABLE: t.checkout.unavailable,
        OUT_OF_STOCK: locale === "de" ? "Ein Artikel ist nicht mehr in der gewünschten Menge verfügbar." : "An item is no longer available in the requested quantity.",
        BANK_TRANSFER_DETAILS_NOT_CONFIGURED: locale === "de" ? "Die Bankverbindung ist noch nicht konfiguriert." : "The bank account has not been configured yet.",
        EMAIL_PROVIDER_NOT_CONFIGURED: locale === "de" ? "Der Versand der Bestellbestätigung ist noch nicht konfiguriert." : "Order confirmation email is not configured yet.",
        EMAIL_PROVIDER_UNSUPPORTED: locale === "de" ? "Der E-Mail-Dienst ist nicht korrekt konfiguriert." : "The email service is not configured correctly.",
        STRIPE_NOT_CONFIGURED: locale === "de" ? "Der Zahlungsanbieter ist noch nicht konfiguriert." : "The payment provider is not configured yet.",
        STRIPE_WEBHOOK_NOT_CONFIGURED: locale === "de" ? "Die Zahlungsbestätigung ist noch nicht eingerichtet." : "Payment confirmation is not configured yet.",
        RATE_LIMITED: locale === "de" ? "Bitte warten Sie eine Minute und versuchen Sie es erneut." : "Please wait a minute and try again.",
        INVALID_CHECKOUT: locale === "de" ? "Bitte prüfen Sie Ihre Adresse und die Artikel im Warenkorb." : "Please check your address and cart items.",
        SUPABASE_SERVER_NOT_CONFIGURED: locale === "de" ? "Die Shop-Datenbank ist noch nicht verbunden." : "The shop database is not connected yet.",
      };
      if (["CHECKOUT_EXPIRED", "CHECKOUT_KEY_REUSED"].includes(result.error)) checkoutAttempt.current = null;
      setError(messages[result.error] ?? (locale === "de" ? "Die Bestellung konnte nicht übermittelt werden. Bitte versuchen Sie es erneut." : "The order could not be submitted. Please try again."));
    } catch {
      setError(locale === "de" ? "Die Verbindung wurde unterbrochen. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut." : "The connection was interrupted. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function personFields(value: AddressState, kind: "shipping" | "billing", update: (next: AddressState) => void) {
    return <>
      <SalutationField locale={locale} value={value.salutation} autoComplete={`${kind} honorific-prefix`} onChange={(salutation) => update({ ...value, salutation })} />
      <label>{t.checkout.firstName}<input required autoComplete={`${kind} given-name`} value={value.firstName} onChange={(event) => update({ ...value, firstName: event.target.value })} /></label>
      <label>{t.checkout.lastName}<input required autoComplete={`${kind} family-name`} value={value.lastName} onChange={(event) => update({ ...value, lastName: event.target.value })} /></label>
      <label className="span-2">{t.checkout.company}<input autoComplete={`${kind} organization`} value={value.company} onChange={(event) => update({ ...value, company: event.target.value })} /></label>
    </>;
  }

  function streetFields(value: AddressState, kind: "shipping" | "billing", update: (next: AddressState) => void) {
    return <>
      <label className="span-1-5">{t.checkout.street}<input required autoComplete={`${kind} address-line1`} value={value.street} onChange={(event) => update({ ...value, street: event.target.value })} /></label>
      <label>{t.checkout.houseNumber}<input required autoComplete={`${kind} address-line2`} value={value.houseNumber} onChange={(event) => update({ ...value, houseNumber: event.target.value })} /></label>
      <label>{t.checkout.postalCode}<input required autoComplete={`${kind} postal-code`} value={value.postalCode} onChange={(event) => update({ ...value, postalCode: event.target.value })} /></label>
      <label>{t.checkout.city}<input required autoComplete={`${kind} address-level2`} value={value.city} onChange={(event) => update({ ...value, city: event.target.value })} /></label>
    </>;
  }

  if (cart.hydrated && cart.lines.length === 0) return <div className="empty-state"><h1>{t.cart.empty}</h1></div>;
  return (
    <form className="checkout-layout" onSubmit={submit}>
      <section className="checkout-form-section">
        <header><p>{locale === "de" ? "Gast-Checkout" : "Guest checkout"}</p><h1>{t.checkout.title}</h1></header>
        {error && <div className="form-alert" role="alert"><WarningCircle size={20} />{error}</div>}
        <fieldset>
          <legend>{t.checkout.billingDetails}</legend>
          <div className="form-grid">
            {personFields(address, "shipping", setAddress)}
            <label className="span-2">{t.checkout.email}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /><small className="field-help">{t.checkout.emailConfirmation}</small></label>
            <label className="span-2">{t.checkout.phone}<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <label className="span-2">{t.checkout.country}<select autoComplete="shipping country" value={address.country} onChange={(event) => setAddress((current) => ({ ...current, country: event.target.value }))}><option value="CH">{locale === "de" ? "Schweiz" : "Switzerland"}</option></select></label>
          </div>
        </fieldset>
        <fieldset><legend>{t.checkout.delivery}</legend><div className="form-grid">{streetFields(address, "shipping", setAddress)}</div></fieldset>
        <fieldset>
          <legend>{t.common.shipping}</legend>
          {shippingLoading ? <div className="shipping-skeleton" /> : methods.length ? <div className="shipping-options">{methods.map((method) => <label key={method.id}><input type="radio" name="shipping" checked={methodId === method.id} onChange={() => setMethodId(method.id)} /><span><strong>{method.name}</strong><small>{method.estimate}</small></span><b>{formatMoney(method.fee, method.currency, locale)}</b></label>)}</div> : shippingChecked && <div className="configuration-notice"><WarningCircle size={20} /><span>{t.checkout.unavailable}</span></div>}
        </fieldset>
        <label className="checkbox-line"><input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} />{t.checkout.billingSame}</label>
        {!billingSame && <fieldset><legend>{locale === "de" ? "Abweichende Rechnungsadresse" : "Different billing address"}</legend><div className="form-grid">{personFields(billingAddress, "billing", setBillingAddress)}{streetFields(billingAddress, "billing", setBillingAddress)}<label className="span-2">{t.checkout.country}<select autoComplete="billing country" value={billingAddress.country} onChange={(event) => setBillingAddress((current) => ({ ...current, country: event.target.value }))}><option value="CH">{locale === "de" ? "Schweiz" : "Switzerland"}</option></select></label></div></fieldset>}
        <button className="button primary-button checkout-button" type="submit" disabled={!methodId || submitting || shippingLoading || !cart.hydrated}>{submitting ? (locale === "de" ? "Bestellung wird übermittelt…" : "Submitting order…") : t.checkout.continue}</button>
        <p className="secure-note"><LockKey size={17} />{t.checkout.secure}</p>
      </section>
      <aside className="checkout-summary">
        <h2>{locale === "de" ? "Ihre Auswahl" : "Your selection"}</h2>
        {cart.lines.map((line) => <div className="checkout-line" key={line.id}><span>{line.quantity}×</span><div><strong>{line.name[locale]}</strong><small>{line.variantLabel[locale]}</small></div><b>{formatMoney(line.unitPrice * line.quantity, line.currency, locale)}</b></div>)}
        <div className="summary-row"><span>{t.common.subtotal}</span><b>{formatMoney(cart.subtotal, currency, locale)}</b></div>
        <div className="summary-row"><span>{t.common.shipping}</span><b>{selectedMethod ? formatMoney(selectedMethod.fee, currency, locale) : "-"}</b></div>
        <div className="summary-total"><span>{t.common.total}</span><strong>{formatMoney(total, currency, locale)}</strong></div>
      </aside>
    </form>
  );
}
