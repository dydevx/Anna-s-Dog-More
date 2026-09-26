import Link from "next/link";
import { Cube, Plus } from "@phosphor-icons/react/dist/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { createProductAction } from "../actions";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminStatus } from "@/components/admin/admin-status";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const admin = createAdminClient();
  const [{ data }, { data: categories }] = await Promise.all([
    admin.from("products").select("id,name_de,slug,base_price,currency,active,featured,product_variants(stock_quantity,active)").order("updated_at", { ascending: false }),
    admin.from("categories").select("id,name_de").order("sort_order"),
  ]);

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p>Katalog</p>
          <h1>Produkte</h1>
          <span>{data?.length ?? 0} Produkte im Katalog</span>
        </div>
      </header>

      {query.error && <div className="form-alert" role="alert">Produkt konnte nicht angelegt werden. Bitte Eingaben und Slug prüfen.</div>}

      <section className="admin-section admin-table-section" aria-label="Produktliste">
        {(data ?? []).length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-products-table">
              <thead><tr><th>Produkt</th><th>Preis</th><th>Bestand</th><th>Status</th></tr></thead>
              <tbody>
                {(data ?? []).map((product) => {
                  const stock = (product.product_variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_quantity), 0);
                  return (
                    <tr key={product.id}>
                      <td><Link className="admin-primary-link" href={`/admin/products/${product.id}`}>{product.name_de}</Link><small>/{product.slug}</small></td>
                      <td><strong>{formatMoney(Number(product.base_price), product.currency, "de")}</strong></td>
                      <td><span className="admin-stock" data-empty={stock === 0 ? "true" : undefined}>{stock}</span></td>
                      <td><AdminStatus status={product.active ? "active" : "archived"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state"><Cube size={30} aria-hidden="true" /><strong>Noch keine Produkte</strong><span>Legen Sie das erste Produkt über den Bereich unten an.</span></div>
        )}
      </section>

      <details className="admin-create-panel" open={Boolean(query.error)}>
        <summary>
          <span className="admin-create-icon"><Plus size={19} aria-hidden="true" /></span>
          <span><strong>Neues Produkt anlegen</strong><small>Startet archiviert, damit Sie Inhalt, Varianten und Bilder in Ruhe ergänzen können.</small></span>
        </summary>
        <div className="admin-create-content">
          <form action={createProductAction} className="admin-form-grid">
            <label>Name DE<input name="name_de" required /></label>
            <label>Name EN<input name="name_en" required /></label>
            <label>SEO Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="produkt-name" /></label>
            <label>Kategorie<select name="category_id" required defaultValue=""><option value="" disabled>Bitte wählen</option>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name_de}</option>)}</select></label>
            <label>Produkttyp<select name="product_type" defaultValue="simple"><option value="simple">Einfach</option><option value="configurable">Konfigurierbar</option><option value="bundle">Set / Bundle</option></select></label>
            <label>Basispreis<input name="base_price" type="number" min="0" step="0.01" required /></label>
            <label>Währung<input name="currency" maxLength={3} defaultValue="CHF" required /></label>
            <div className="admin-form-action"><button className="button primary-button" type="submit">Archiviertes Produkt anlegen</button></div>
          </form>
        </div>
      </details>
    </>
  );
}
