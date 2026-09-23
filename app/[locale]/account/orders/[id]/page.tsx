import Link from "next/link";
import { notFound } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/config";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

type OrderItem = { id: string; product_name: string; variant_description: string; sku: string; quantity: number; unit_price: number; line_total: number };

export default async function AccountOrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const supabase = await createUserClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) notFound();
  const { data: order } = await supabase.from("orders").select("id,order_number,order_status,payment_status,fulfillment_status,subtotal,shipping_total,grand_total,currency,created_at,shipping_address,order_items(id,product_name,variant_description,sku,quantity,unit_price,line_total)").eq("id", id).eq("customer_id", user.id).single();
  if (!order) notFound();
  const isDe = locale === "de";
  const address = order.shipping_address as Record<string, string>;
  const items = (order.order_items ?? []) as OrderItem[];
  return <div className="page-shell account-shell"><nav className="product-breadcrumb"><Link href={`/${locale}/account`}>{isDe ? "Konto" : "Account"}</Link><span>/</span><span>{order.order_number}</span></nav><header className="account-heading"><div><p>{new Intl.DateTimeFormat(isDe ? "de-CH" : "en-CH").format(new Date(order.created_at))}</p><h1>{order.order_number}</h1></div><span className="status-chip">{order.order_status.replaceAll("_", " ")}</span></header><div className="order-account-grid"><section className="account-section"><h2>{isDe ? "Artikel" : "Items"}</h2>{items.map((item) => <article className="order-account-item" key={item.id}><div><strong>{item.product_name}</strong><small>{item.variant_description || item.sku}</small><small>SKU {item.sku}</small></div><span>{item.quantity} × {formatMoney(Number(item.unit_price), order.currency, locale)}</span><b>{formatMoney(Number(item.line_total), order.currency, locale)}</b></article>)}<div className="order-totals"><span>{isDe ? "Zwischensumme" : "Subtotal"}<b>{formatMoney(Number(order.subtotal), order.currency, locale)}</b></span><span>{isDe ? "Versand" : "Shipping"}<b>{formatMoney(Number(order.shipping_total), order.currency, locale)}</b></span><span><strong>{isDe ? "Gesamt" : "Total"}</strong><b>{formatMoney(Number(order.grand_total), order.currency, locale)}</b></span></div></section><aside className="account-section"><h2>{isDe ? "Lieferadresse" : "Shipping address"}</h2><address>{address.firstName} {address.lastName}<br />{address.street} {address.houseNumber}<br />{address.postalCode} {address.city}<br />{address.country}</address><dl><div><dt>{isDe ? "Zahlung" : "Payment"}</dt><dd>{order.payment_status}</dd></div><div><dt>{isDe ? "Versandstatus" : "Fulfilment"}</dt><dd>{order.fulfillment_status}</dd></div></dl></aside></div></div>;
}
