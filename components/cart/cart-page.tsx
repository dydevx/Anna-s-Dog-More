"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { useCart } from "@/components/cart/cart-provider";
import type { Locale } from "@/types/catalog";
import { formatMoney } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/dictionaries";

export function CartPage({ locale }: { locale: Locale }) {
  const cart = useCart();
  const t = getDictionary(locale);
  if (!cart.hydrated) return <div className="cart-skeleton" aria-label="Loading cart"><div /><div /></div>;
  if (cart.lines.length === 0) return <div className="empty-state"><div className="empty-bag" aria-hidden="true" /><h1>{t.cart.empty}</h1><Link className="button primary-button" href={`/${locale}/shop`}>{t.common.continueShopping}</Link></div>;
  return <div className="cart-layout">
    <section><h1>{t.cart.title}</h1><div className="cart-lines">
      {cart.lines.map((line) => <article className="cart-line" key={line.id}>
        <Image src={line.imageUrl} alt={line.name[locale]} width={160} height={160} />
        <div className="cart-line-copy"><Link href={`/${locale}/product/${line.productSlug}`}>{line.name[locale]}</Link><p>{line.variantLabel[locale]}</p><small>SKU {line.sku}</small>
          <div className="quantity-control"><button type="button" onClick={() => cart.setQuantity(line.id, line.quantity - 1)} aria-label="Decrease quantity"><Minus size={16} /></button><span>{line.quantity}</span><button type="button" onClick={() => cart.setQuantity(line.id, line.quantity + 1)} aria-label="Increase quantity"><Plus size={16} /></button></div>
        </div>
        <div className="cart-line-price"><strong>{formatMoney(line.unitPrice * line.quantity, line.currency, locale)}</strong><button type="button" onClick={() => cart.removeLine(line.id)}><Trash size={17} />{t.common.remove}</button></div>
      </article>)}
    </div></section>
    <aside className="order-summary"><h2>{locale === "de" ? "Zusammenfassung" : "Summary"}</h2><div><span>{t.common.subtotal}</span><strong>{formatMoney(cart.subtotal, cart.currency!, locale)}</strong></div><div><span>{t.common.shipping}</span><span>{locale === "de" ? "Im Checkout berechnet" : "Calculated at checkout"}</span></div><p>{t.cart.note}</p><Link className="button primary-button full-button" href={`/${locale}/checkout`}>{t.common.checkout}</Link></aside>
  </div>;
}
