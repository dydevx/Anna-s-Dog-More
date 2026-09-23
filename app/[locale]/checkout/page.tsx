import { CheckoutForm } from "@/components/checkout/checkout-form";
import { isLocale } from "@/lib/i18n/config";

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ payment?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) return null;
  return <div className="page-shell checkout-shell"><CheckoutForm locale={locale} paymentCancelled={query.payment === "cancelled"} /></div>;
}
