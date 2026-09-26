"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLineUp,
  Cube,
  Package,
  SlidersHorizontal,
  Truck,
} from "@phosphor-icons/react";

const links = [
  { label: "Übersicht", href: "/admin", icon: ChartLineUp },
  { label: "Produkte", href: "/admin/products", icon: Cube },
  { label: "Bestellungen", href: "/admin/orders", icon: Package },
  { label: "Versand", href: "/admin/shipping", icon: Truck },
  { label: "Kategorien", href: "/admin/categories", icon: SlidersHorizontal },
] as const;

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin Navigation">
      {links.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);

        return (
          <Link href={href} key={href} aria-current={active ? "page" : undefined}>
            <Icon size={19} weight={active ? "fill" : "regular"} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
