import Link from "next/link";
import { ChartLineUp, Cube, Package, SignOut, SlidersHorizontal, Truck } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/auth/admin";
import { signOutAction } from "@/app/[locale]/account/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const links = [["Übersicht", "/admin", ChartLineUp], ["Produkte", "/admin/products", Cube], ["Bestellungen", "/admin/orders", Package], ["Versand", "/admin/shipping", Truck], ["Kategorien", "/admin/categories", SlidersHorizontal]] as const;
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="wordmark compact" href="/admin"><span>ANNA&apos;S</span><small>ADMIN</small></Link><nav>{links.map(([label, href, Icon]) => <Link href={href} key={href}><Icon size={19} />{label}</Link>)}</nav><div className="admin-user"><small>{user.email}</small><form action={signOutAction}><input type="hidden" name="locale" value="de" /><button type="submit"><SignOut size={18} />Abmelden</button></form></div></aside><main className="admin-main">{children}</main></div>;
}
