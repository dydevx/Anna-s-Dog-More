import { Plus, Truck } from "@phosphor-icons/react/dist/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { createShippingAction } from "../actions";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth/admin";

export default async function ShippingAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const { data } = await createAdminClient().from("shipping_methods").select("id,name_de,estimated_delivery_de,active,shipping_zones(name,country_codes),shipping_rates(currency,fee,free_shipping_threshold,active)").order("created_at");

  return (
    <>
      <header className="admin-page-heading">
        <div><p>Konfiguration</p><h1>Versand</h1><span>Liefergebiete, Gebühren und Laufzeiten verwalten.</span></div>
      </header>
      {query.saved && <div className="admin-success" role="status">Versandart erstellt.</div>}
      {query.error && <div className="form-alert" role="alert">Bitte prüfen Sie alle Angaben.</div>}

      <section className="admin-section">
        <div className="admin-section-heading"><h2>Aktive Regeln</h2><p>{data?.length ?? 0} konfigurierte Versandarten</p></div>
        {(data ?? []).length > 0 ? (
          <div className="shipping-admin-list">
            {(data ?? []).map((method) => {
              const zone = Array.isArray(method.shipping_zones) ? method.shipping_zones[0] : method.shipping_zones;
              const rate = method.shipping_rates?.[0];
              return (
                <article key={method.id}>
                  <div><strong>{method.name_de}</strong><small>{zone?.name} · {zone?.country_codes?.join(", ")}</small></div>
                  <span>{method.estimated_delivery_de || "Keine Lieferzeit"}</span>
                  <b>{rate ? formatMoney(Number(rate.fee), rate.currency, "de") : "Keine Rate"}</b>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="admin-empty-state"><Truck size={30} aria-hidden="true" /><strong>Noch keine Versandart eingerichtet</strong><span>Legen Sie eine Regel an, bevor Bestellungen versendet werden können.</span></div>
        )}
      </section>

      <details className="admin-create-panel" open={Boolean(query.error)}>
        <summary>
          <span className="admin-create-icon"><Plus size={19} aria-hidden="true" /></span>
          <span><strong>Versandart anlegen</strong><small>Gebühren werden erst aktiv, wenn diese Regel gespeichert ist.</small></span>
        </summary>
        <div className="admin-create-content">
          <form action={createShippingAction} className="admin-form-grid shipping-form">
            <label>Zonenname<input name="zone_name" required placeholder="z. B. Schweiz" /></label>
            <label>Land (ISO)<input name="country" required maxLength={2} placeholder="CH" /></label>
            <label>Name DE<input name="name_de" required placeholder="Standardversand" /></label>
            <label>Name EN<input name="name_en" required placeholder="Standard shipping" /></label>
            <label>Lieferzeit DE<input name="estimate_de" placeholder="vom Shop zu bestätigen" /></label>
            <label>Lieferzeit EN<input name="estimate_en" placeholder="to be confirmed by the shop" /></label>
            <label>Gebühr<input name="fee" type="number" min="0" step="0.01" required /></label>
            <label>Währung<input name="currency" maxLength={3} required placeholder="CHF" /></label>
            <label>Gratis ab<input name="threshold" type="number" min="0" step="0.01" /></label>
            <div className="admin-form-action"><button className="button primary-button" type="submit">Versandart speichern</button></div>
          </form>
        </div>
      </details>
    </>
  );
}
