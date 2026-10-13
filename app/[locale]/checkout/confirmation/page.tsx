import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale } from "@/lib/i18n/config";
import { PaymentConfirmation } from "@/components/checkout/payment-confirmation";
import type { PublicOrderStatus } from "@/lib/payments/order-status";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const token = z.uuid().safeParse(query.token);
  if (!isLocale(locale) || !token.success) notFound();
  let order: PublicOrderStatus | null = null;
  try {
    const { data, error } = await createAdminClient().from("orders").select("order_number,payment_status,grand_total,currency").eq("public_token", token.data).maybeSingle();
    if (!error) order = data;
  } catch { /* The client offers retry during a database outage. */ }
  return <PaymentConfirmation locale={locale} token={token.data} initialOrder={order} />;
}
