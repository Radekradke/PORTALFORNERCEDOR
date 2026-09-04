import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { EXTERNAL_NAV } from "./nav-config";

export function ExternalNav({ role }: { role: UserRole }) {
  const items = EXTERNAL_NAV.filter((item) => item.enabled && (!item.roles || item.roles.includes(role)));

  return (
    <nav aria-label="Navegação do portal do fornecedor" className="flex flex-wrap gap-1 border-b bg-card px-4 py-2 sm:px-6">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
