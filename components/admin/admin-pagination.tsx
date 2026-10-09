import Link from "next/link";
import { ADMIN_PAGE_SIZE } from "@/lib/admin-pagination";

export function AdminPagination({ page, hasNext, count, pathname, status }: {
  page: number; hasNext: boolean; count: number; pathname: string; status?: string;
}) {
  const href = (target: number) => {
    const params = new URLSearchParams({ page: String(target) });
    if (status) params.set("status", status);
    return `${pathname}?${params}`;
  };
  return <nav className="admin-pagination" aria-label="Seitennavigation">
    <span>Seite {page} · {count} von bis zu {ADMIN_PAGE_SIZE} Einträgen</span>
    <div>
      {page > 1 && <Link className="button secondary-button" href={href(page - 1)}>Zurück</Link>}
      {hasNext && <Link className="button secondary-button" href={href(page + 1)}>Weiter</Link>}
    </div>
  </nav>;
}
