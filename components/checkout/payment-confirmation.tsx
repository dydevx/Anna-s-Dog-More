"use client";

import Link from "next/link";
import { CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";
import { isPaymentTerminal, type PublicOrderStatus } from "@/lib/payments/order-status";
import type { Locale } from "@/types/catalog";

export function PaymentConfirmation({ locale, token, initialOrder }: { locale: Locale; token: string; initialOrder: PublicOrderStatus | null }) {
  const [order, setOrder] = useState(initialOrder);
  const [retry, setRetry] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const { hydrated, removePurchasedLines } = useCart();
  const status = order?.payment_status ?? "pending";
  const de = locale === "de";

  useEffect(() => {
    if (isPaymentTerminal(status)) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      setWaiting(true);
      try {
        const response = await fetch(`/api/checkout/status?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
        if (!response.ok) throw new Error("STATUS_UNAVAILABLE");
        const data: PublicOrderStatus = await response.json();
        if (controller.signal.aborted) return;
        setOrder(data); setUnavailable(false);
        if (isPaymentTerminal(data.payment_status)) { setWaiting(false); return; }
      } catch {
        if (controller.signal.aborted) return;
        setUnavailable(true);
      }
      if (++attempts < 20) timer = setTimeout(poll, 3000);
      else setWaiting(false);
    }
    timer = setTimeout(poll, 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [status, token, retry]);

  useEffect(() => {
    if (!hydrated || !["paid", "partially_refunded", "refunded"].includes(status)) return;
    try {
      const key = `annas-checkout:${token}`;
      const stored = window.sessionStorage.getItem(key);
      if (!stored) return;
      const purchased: unknown = JSON.parse(stored);
      if (!Array.isArray(purchased) || !purchased.every((item) => typeof item?.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0)) return;
      window.sessionStorage.removeItem(key);
      removePurchasedLines(purchased);
    } catch { /* Storage is optional; server payment status remains authoritative. */ }
  }, [hydrated, removePurchasedLines, status, token]);

  const paid = status === "paid";
  const failed = status === "failed" || status === "cancelled";
  const refunded = status === "refunded" || status === "partially_refunded";
  const heading = paid ? (de ? "Vielen Dank für Ihre Bestellung." : "Thank you for your order.")
    : failed ? (de ? "Zahlung nicht abgeschlossen." : "Payment was not completed.")
    : refunded ? (de ? "Zahlung erstattet." : "Payment refunded.")
    : (de ? "Zahlung wird bestätigt." : "Confirming your payment.");
  const explanation = paid ? (de ? "Ihre Zahlung wurde bestätigt. Bitte bewahren Sie Ihre Bestellnummer auf." : "Your payment is confirmed. Please keep your order number.")
    : failed ? (de ? "Ihr Warenkorb bleibt erhalten. Sie können den Checkout erneut starten." : "Your cart is saved. You can start checkout again.")
    : refunded ? (status === "partially_refunded" ? (de ? "Ein Teilbetrag wurde erstattet." : "A partial refund was issued.") : (de ? "Der vollständige Betrag wurde erstattet." : "The full amount was refunded."))
    : unavailable ? (de ? "Der Zahlungsstatus ist gerade nicht erreichbar. Bitte prüfen Sie ihn erneut, bevor Sie eine weitere Zahlung starten." : "Payment status is temporarily unavailable. Please check again before starting another payment.")
    : (de ? "Wir warten auf die Zahlungsbestätigung. Bitte starten Sie noch keine weitere Zahlung." : "We are waiting for payment confirmation. Please do not start another payment yet.");
  return <div className="confirmation-state">
    {paid ? <CheckCircle size={54} weight="light" aria-hidden="true" /> : failed ? <WarningCircle size={54} weight="light" aria-hidden="true" /> : <Clock size={54} weight="light" aria-hidden="true" />}
    <div role="status" aria-live="polite"><h1>{heading}</h1><p>{explanation}</p></div>
    {order && <><p>{de ? "Bestellnummer" : "Order number"}: {order.order_number}</p><strong>{formatMoney(Number(order.grand_total), order.currency, locale)}</strong></>}
    {!isPaymentTerminal(status) && <button className="button secondary-button" type="button" disabled={waiting} onClick={() => setRetry((value) => value + 1)}>{waiting ? (de ? "Status wird geprüft…" : "Checking status…") : (de ? "Status erneut prüfen" : "Check status again")}</button>}
    <Link className="button primary-button" href={`/${locale}/${failed ? "checkout" : "shop"}`}>{failed ? (de ? "Erneut zur Kasse" : "Try checkout again") : (de ? "Weiter einkaufen" : "Continue shopping")}</Link>
  </div>;
}
