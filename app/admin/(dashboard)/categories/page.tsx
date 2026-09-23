import { createAdminClient } from "@/lib/supabase/admin";
import { createCategoryAction, updateCategoryAction } from "../actions";
import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const { data } = await createAdminClient().from("categories").select("id,name_de,name_en,slug,active,sort_order,products(count)").order("sort_order");
  return <>
    <header className="admin-page-heading"><div><p>Katalogstruktur</p><h1>Kategorien</h1></div></header>
    {query.saved && <div className="admin-success">Kategorie gespeichert.</div>}
    {query.error && <div className="form-alert">Kategorie konnte nicht gespeichert werden.</div>}
    <section className="admin-section">
      <h2>Kategorien bearbeiten</h2>
      <div className="category-admin-list">
        {(data ?? []).map((category) => <form action={updateCategoryAction} key={category.id}>
          <input type="hidden" name="id" value={category.id} />
          <label>Name DE<input name="name_de" defaultValue={category.name_de} required /></label>
          <label>Name EN<input name="name_en" defaultValue={category.name_en} required /></label>
          <label>Reihenfolge<input name="sort_order" type="number" defaultValue={category.sort_order} required /></label>
          <label className="admin-check"><input name="active" type="checkbox" defaultChecked={category.active} />Aktiv</label>
          <span><strong>/{category.slug}</strong><small>{category.products?.[0]?.count ?? 0} Produkte</small></span>
          <button className="button secondary-button" type="submit">Speichern</button>
        </form>)}
      </div>
    </section>
    <section className="admin-section">
      <div className="admin-section-heading"><h2>Kategorie anlegen</h2><p>Der Slug bleibt nach dem Anlegen stabil, damit bestehende URLs nicht brechen.</p></div>
      <form action={createCategoryAction} className="admin-form-grid">
        <label>Name DE<input name="name_de" required /></label>
        <label>Name EN<input name="name_en" required /></label>
        <label>SEO Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
        <label>Reihenfolge<input name="sort_order" type="number" defaultValue="0" required /></label>
        <label className="admin-check"><input name="active" type="checkbox" />Aktiv</label>
        <button className="button primary-button" type="submit">Kategorie anlegen</button>
      </form>
    </section>
  </>;
}
