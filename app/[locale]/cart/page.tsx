import { CartPage } from "@/components/cart/cart-page";
import { isLocale } from "@/lib/i18n/config";

export default async function CartRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  return <div className="page-shell cart-page-shell"><CartPage locale={locale} /></div>;
}
