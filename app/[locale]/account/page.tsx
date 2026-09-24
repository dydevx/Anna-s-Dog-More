import Link from "next/link";
import { addAddressAction, deleteAddressAction, forgotPasswordAction, signInAction, signOutAction, signUpAction } from "./actions";
import { createUserClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type AccountOrder = { id: string; order_number: string; order_status: string; grand_total: number; currency: string; created_at: string };
type SavedAddress = { id: string; label: string | null; first_name: string; last_name: string; street: string; house_number: string; postal_code: string; city: string; country_code: string };

function authErrorMessage(error: string, isDe: boolean) {
  if (error === "config") return isDe ? "Supabase Auth ist noch nicht konfiguriert." : "Supabase Auth is not configured yet.";
  if (error === "email-rate-limit") return isDe ? "Zu viele E-Mails wurden angefordert. Bitte versuchen Sie es später erneut." : "Too many emails were requested. Please try again later.";
  if (error === "email-not-authorized") return isDe ? "Der Standard-E-Mail-Dienst darf nicht an diese Adresse senden. Bitte konfigurieren Sie Custom SMTP." : "The default email service cannot send to this address. Please configure custom SMTP.";
  if (error === "email-send") return isDe ? "Die E-Mail konnte nicht gesendet werden. Bitte prüfen Sie die SMTP-Einstellungen." : "The email could not be sent. Please check the SMTP settings.";
  return isDe ? "Anmeldung nicht möglich. Bitte prüfen Sie Ihre Angaben." : "Unable to sign in. Check your details.";
}

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) return null;
  let user = null;
  let orders: AccountOrder[] = [];
  let addresses: SavedAddress[] = [];
  try {
    const supabase = await createUserClient();
    user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const [orderResult, addressResult] = await Promise.all([
        supabase.from("orders").select("id,order_number,order_status,grand_total,currency,created_at").order("created_at", { ascending: false }),
        supabase.from("addresses").select("id,label,first_name,last_name,street,house_number,postal_code,city,country_code").order("created_at", { ascending: false }),
      ]);
      orders = orderResult.data ?? [];
      addresses = addressResult.data ?? [];
    }
  } catch { /* A clear setup state is rendered below. */ }
  const isDe = locale === "de";

  if (!user) return <div className="page-shell account-shell">
    <header className="page-intro"><h1>{isDe ? "Ihr Konto" : "Your account"}</h1><p>{isDe ? "Bestellungen ansehen und Adressen verwalten. Für den Einkauf ist kein Konto erforderlich." : "View orders and manage addresses. An account is not required to purchase."}</p></header>
    {query.error && <div className="form-alert" role="alert">{authErrorMessage(query.error, isDe)}</div>}
    {query.message && <div className="configuration-notice">{isDe ? "Bitte prüfen Sie Ihren E-Mail-Posteingang." : "Please check your email inbox."}</div>}
    <div className="auth-grid">
      <form action={signInAction} className="auth-form"><input type="hidden" name="locale" value={locale} /><h2>{isDe ? "Anmelden" : "Sign in"}</h2><label>E-Mail<input name="email" type="email" required autoComplete="email" /></label><label>{isDe ? "Passwort" : "Password"}<input name="password" type="password" required minLength={8} autoComplete="current-password" /></label><button className="button primary-button" type="submit">{isDe ? "Anmelden" : "Sign in"}</button></form>
      <form action={signUpAction} className="auth-form"><input type="hidden" name="locale" value={locale} /><h2>{isDe ? "Konto erstellen" : "Create account"}</h2><label>E-Mail<input name="email" type="email" required autoComplete="email" /></label><label>{isDe ? "Passwort" : "Password"}<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label><button className="button secondary-button" type="submit">{isDe ? "Registrieren" : "Register"}</button></form>
    </div>
    <form action={forgotPasswordAction} className="forgot-form"><input type="hidden" name="locale" value={locale} /><label>{isDe ? "Passwort vergessen?" : "Forgot password?"}<input name="email" type="email" required placeholder="email@example.com" /></label><button type="submit">{isDe ? "Link senden" : "Send link"}</button></form>
  </div>;

  return <div className="page-shell account-shell">
    <header className="account-heading"><div><p>{user.email}</p><h1>{isDe ? "Mein Konto" : "My account"}</h1></div><form action={signOutAction}><input type="hidden" name="locale" value={locale} /><button className="button secondary-button" type="submit">{isDe ? "Abmelden" : "Sign out"}</button></form></header>
    {query.message && <div className="admin-success">{isDe ? "Änderung gespeichert." : "Changes saved."}</div>}
    {query.error && <div className="form-alert">{isDe ? "Die Änderung konnte nicht gespeichert werden." : "The change could not be saved."}</div>}
    <section className="account-section">
      <h2>{isDe ? "Bestellungen" : "Orders"}</h2>
      {orders.length ? <div className="account-orders">{orders.map((order) => <Link href={`/${locale}/account/orders/${order.id}`} key={order.id}><div><strong>{order.order_number}</strong><small>{new Intl.DateTimeFormat(isDe ? "de-CH" : "en-CH").format(new Date(order.created_at))}</small></div><span>{order.order_status.replaceAll("_", " ")}</span><b>{formatMoney(Number(order.grand_total), order.currency, locale)}</b></Link>)}</div> : <div className="empty-state compact-empty"><h3>{isDe ? "Noch keine Bestellungen" : "No orders yet"}</h3><p>{isDe ? "Bestellungen, die Sie angemeldet aufgeben, erscheinen hier." : "Orders placed while signed in will appear here."}</p></div>}
    </section>
    <section className="account-section">
      <h2>{isDe ? "Gespeicherte Adressen" : "Saved addresses"}</h2>
      <div className="saved-addresses">{addresses.map((address) => <article key={address.id}><strong>{address.label || `${address.first_name} ${address.last_name}`}</strong><address>{address.first_name} {address.last_name}<br />{address.street} {address.house_number}<br />{address.postal_code} {address.city}<br />{address.country_code}</address><form action={deleteAddressAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={address.id} /><button type="submit">{isDe ? "Entfernen" : "Remove"}</button></form></article>)}</div>
      <form action={addAddressAction} className="account-address-form form-grid">
        <input type="hidden" name="locale" value={locale} />
        <label>{isDe ? "Bezeichnung" : "Label"}<input name="label" placeholder={isDe ? "Zuhause" : "Home"} /></label>
        <label>{isDe ? "Vorname" : "First name"}<input name="first_name" required autoComplete="given-name" /></label>
        <label>{isDe ? "Nachname" : "Last name"}<input name="last_name" required autoComplete="family-name" /></label>
        <label>{isDe ? "Straße" : "Street"}<input name="street" required autoComplete="address-line1" /></label>
        <label>{isDe ? "Hausnummer" : "House number"}<input name="house_number" required /></label>
        <label>{isDe ? "Postleitzahl" : "Postal code"}<input name="postal_code" required autoComplete="postal-code" /></label>
        <label>{isDe ? "Ort" : "City"}<input name="city" required autoComplete="address-level2" /></label>
        <label>{isDe ? "Land (ISO)" : "Country (ISO)"}<input name="country_code" required maxLength={2} defaultValue="CH" autoComplete="country" /></label>
        <button className="button primary-button" type="submit">{isDe ? "Adresse speichern" : "Save address"}</button>
      </form>
    </section>
  </div>;
}
