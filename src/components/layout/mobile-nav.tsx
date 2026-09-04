import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { INTERNAL_NAV } from "./nav-config";

/** Navegação horizontal para telas estreitas (< 768px), onde a Sidebar fica oculta. */
export function MobileNav({ role }: { role: UserRole }) {
  const items = INTERNAL_NAV.filter((item) => item.enabled && (!item.roles || item.roles.includes(role)));

  return (
    <nav
      aria-label="Navegação principal (móvel)"
      className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-2 md:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
