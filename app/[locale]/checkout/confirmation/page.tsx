import Link from "next/link";
import { CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale) || !query.token) return <div className="standalone-state"><h1>Invalid confirmation link</h1></div>;
  let order: { order_number: string; payment_status: string; grand_total: number; currency: string } | null = null;
  try {
    const { data } = await createAdminClient().from("orders").select("order_number,payment_status,grand_total,currency").eq("public_token", query.token).single();
    order = data;
  } catch { /* The status below remains configuration-safe. */ }
  const paid = order?.payment_status === "paid";
  return <div className="confirmation-state">{paid ? <CheckCircle size={54} weight="light" /> : <Clock size={54} weight="light" />}<p>{order?.order_number ?? "Order"}</p><h1>{paid ? (locale === "de" ? "Vielen Dank für Ihre Bestellung." : "Thank you for your order.") : (locale === "de" ? "Zahlung wird bestätigt." : "Payment is being confirmed.")}</h1><span>{paid ? (process.env.EMAIL_PROVIDER ? (locale === "de" ? "Die Bestätigung wird per E-Mail versendet." : "A confirmation will be sent by email.") : (locale === "de" ? "Die Zahlung ist bestätigt. Der E-Mail-Dienst wird vor dem Shop-Start eingerichtet." : "Payment is confirmed. Email delivery will be configured before launch.")) : (locale === "de" ? "Diese Seite bestätigt keinen Zahlungseingang. Der signierte Provider-Webhook ist noch ausstehend." : "This page does not confirm payment. The signed provider webhook is still pending.")}</span>{order && <strong>{formatMoney(Number(order.grand_total), order.currency, locale)}</strong>}<Link className="button primary-button" href={`/${locale}/shop`}>{locale === "de" ? "Weiter einkaufen" : "Continue shopping"}</Link></div>;
}
