import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { addProductImageAction, addVariantAction, updateProductAction, updateVariantStockAction } from "../../actions";
import { ProductImageUpload } from "@/components/admin/product-image-upload";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminStatus } from "@/components/admin/admin-status";

export default async function AdminProductEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; created?: string }> }) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const admin = createAdminClient();
  const [{ data: product }, { data: categories }] = await Promise.all([
    admin.from("products").select("*,product_variants(*),product_images(*)").eq("id", id).single(),
    admin.from("categories").select("id,name_de").order("sort_order"),
  ]);
  if (!product) notFound();

  return <>
    <Link className="admin-back-link" href="/admin/products"><ArrowLeft size={16} aria-hidden="true" /> Zurück zur Produktliste</Link>
    <header className="admin-page-heading admin-detail-heading"><div><p>Produkt bearbeiten</p><h1>{product.name_de}</h1><AdminStatus status={product.active ? "active" : "archived"} /></div></header>
    {(query.saved || query.created) && <div className="admin-success" role="status">{query.created ? "Produkt archiviert angelegt. Ergänzen Sie jetzt Inhalt, Bild und Variante." : query.saved === "stock" ? "Bestand wurde aktualisiert." : "Änderungen gespeichert."}</div>}
    {query.error && <div className="form-alert" role="alert">{query.error === "stock" ? "Bestand konnte nicht aktualisiert werden. Bitte prüfen Sie die Eingabe und versuchen Sie es erneut." : `Änderungen konnten nicht gespeichert werden (${query.error}).`}</div>}
    <form action={updateProductAction} className="admin-editor">
      <input type="hidden" name="id" value={product.id} />
      <section>
        <h2>Inhalt und Sichtbarkeit</h2>
        <div className="admin-form-grid">
          <label>Name DE<input name="name_de" defaultValue={product.name_de} required /></label>
          <label>Name EN<input name="name_en" defaultValue={product.name_en} required /></label>
          <label>Kategorie<select name="category_id" defaultValue={product.category_id} required>{(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name_de}</option>)}</select></label>
          <label>Basispreis<input name="base_price" type="number" step="0.01" min="0" defaultValue={product.base_price} required /></label>
          <label>Währung<input name="currency" maxLength={3} defaultValue={product.currency} required /></label>
          <label className="admin-check"><input name="active" type="checkbox" defaultChecked={product.active} />Im Shop sichtbar</label>
          <label className="admin-check"><input name="featured" type="checkbox" defaultChecked={product.featured} />Hervorgehoben</label>
          <label className="span-2">Kurztext DE<textarea name="short_description_de" rows={2} defaultValue={product.short_description_de ?? ""} /></label>
          <label className="span-2">Kurztext EN<textarea name="short_description_en" rows={2} defaultValue={product.short_description_en ?? ""} /></label>
          <label className="span-2">Beschreibung DE<textarea name="description_de" rows={7} defaultValue={product.description_de ?? ""} /></label>
          <label className="span-2">Beschreibung EN<textarea name="description_en" rows={7} defaultValue={product.description_en ?? ""} /></label>
        </div>
        <button className="button primary-button" type="submit">Produkt speichern</button>
      </section>
    </form>

    <section className="admin-section">
      <div className="admin-section-heading"><h2>Bilder</h2><p>Uploads werden serverseitig auf maximal 1600 px skaliert und als WebP in Supabase Storage gespeichert.</p></div>
      <div className="admin-image-list">{(product.product_images ?? []).map((image: { id: string; url: string; alt_de: string }) => <a href={image.url} key={image.id} target="_blank" rel="noreferrer"><strong>{image.alt_de}</strong><small>{image.url}</small></a>)}</div>
      <ProductImageUpload productId={product.id} />
      <div className="admin-section-heading"><h2>Vorhandene Bild-URL verknüpfen</h2><p>Nur für bereits optimierte und zur Nutzung freigegebene Assets.</p></div>
      <form action={addProductImageAction} className="admin-form-grid">
        <input type="hidden" name="productId" value={product.id} />
        <label className="span-2">Bild-URL<input name="url" type="url" required placeholder="https://.../image.webp" /></label>
        <label>Alt-Text DE<input name="alt_de" required /></label>
        <label>Alt-Text EN<input name="alt_en" required /></label>
        <button className="button secondary-button" type="submit">Bild verknüpfen</button>
      </form>
    </section>

    <section className="admin-section">
      <div className="admin-section-heading"><h2>Varianten und Bestand</h2><p>Bestand wird pro SKU geführt. Preislose Varianten bleiben sichtbar, können aber nicht bestellt werden.</p></div>
      <div className="variant-admin-list">{(product.product_variants ?? []).map((variant: { id: string; sku: string; stock_quantity: number; active: boolean; size?: string; color?: string; fabric?: string; mattress_type?: string; configuration?: string }) => <form action={updateVariantStockAction} key={variant.id}>
        <input type="hidden" name="id" value={variant.id} /><input type="hidden" name="productId" value={product.id} />
        <div><strong>{variant.sku}</strong><small>{[variant.size, variant.color, variant.fabric, variant.mattress_type, variant.configuration].filter(Boolean).join(" / ")}</small></div>
        <label>Bestand<input name="stock" type="number" min="0" step="1" inputMode="numeric" defaultValue={variant.stock_quantity} required /></label>
        <label className="admin-check"><input name="active" type="checkbox" defaultChecked={variant.active} />Bestellbar</label>
        <AdminSubmitButton className="button secondary-button" idleLabel="Bestand speichern" pendingLabel="Wird gespeichert..." />
      </form>)}</div>
      <div className="admin-panel">
        <h2>Exakte Variante anlegen</h2>
        <form action={addVariantAction} className="admin-form-grid">
          <input type="hidden" name="productId" value={product.id} />
          <label>SKU<input name="sku" required /></label><label>Art.-Nr.<input name="article_number" required /></label>
          <label>Preis<input name="price" type="number" min="0" step="0.01" /></label><label>Währung<input name="currency" maxLength={3} defaultValue={product.currency} required /></label>
          <label>Bestand<input name="stock" type="number" min="0" defaultValue="0" required /></label><label>Größe<input name="size" /></label>
          <label>Farbe<input name="color" /></label><label>Material<input name="material" /></label>
          <label>Stoff<input name="fabric" /></label><label>Matratze<input name="mattress_type" /></label>
          <label>Konfiguration<input name="configuration" /></label><label>Kapazität<input name="capacity" /></label>
          <label className="admin-check"><input name="active" type="checkbox" />Bestellbar</label>
          <button className="button primary-button" type="submit">Variante anlegen</button>
        </form>
      </div>
    </section>
  </>;
}
