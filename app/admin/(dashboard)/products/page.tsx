import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { createProductAction } from "../actions";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const admin = createAdminClient();
  const [{ data }, { data: categories }] = await Promise.all([
    admin.from("products").select("id,name_de,slug,base_price,currency,active,featured,product_variants(stock_quantity,active)").order("updated_at", { ascending: false }),
    admin.from("categories").select("id,name_de").order("sort_order"),
  ]);

  return <>
    <header className="admin-page-heading"><div><p>Katalog</p><h1>Produkte</h1></div><span>{data?.length ?? 0} Produkte</span></header>
    {query.error && <div className="form-alert">Produkt konnte nicht angelegt werden. Bitte Eingaben und Slug prüfen.</div>}
    <section className="admin-table">
      <div className="admin-table-head admin-products-row"><span>Produkt</span><span>Preis</span><span>Bestand</span><span>Status</span></div>
      {(data ?? []).map((product) => <Link className="admin-table-row admin-products-row" href={`/admin/products/${product.id}`} key={product.id}><div><strong>{product.name_de}</strong><small>/{product.slug}</small></div><b>{formatMoney(Number(product.base_price), product.currency, "de")}</b><span>{(product.product_variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_quantity), 0)}</span><span className="status-chip">{product.active ? "Aktiv" : "Archiviert"}</span></Link>)}
    </section>
    <section className="admin-section">
      <div className="admin-section-heading"><h2>Produkt anlegen</h2><p>Neue Produkte starten archiviert und werden erst nach Varianten- und Bildprüfung veröffentlicht.</p></div>
      <form action={createProductAction} className="admin-form-grid">
        <label>Name DE<input name="name_de" required /></label>
        <label>Name EN<input name="name_en" required /></label>
        <label>SEO Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="produkt-name" /></label>
        <label>Kategorie<select name="category_id" required defaultValue=""><option value="" disabled>Bitte wählen</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name_de}</option>)}</select></label>
        <label>Produkttyp<select name="product_type" defaultValue="simple"><option value="simple">Einfach</option><option value="configurable">Konfigurierbar</option><option value="bundle">Set / Bundle</option></select></label>
        <label>Basispreis<input name="base_price" type="number" min="0" step="0.01" required /></label>
        <label>Währung<input name="currency" maxLength={3} defaultValue="CHF" required /></label>
        <button className="button primary-button" type="submit">Archiviertes Produkt anlegen</button>
      </form>
    </section>
  </>;
}
