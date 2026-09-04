import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { INTERNAL_NAV } from "./nav-config";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: UserRole }) {
  const items = INTERNAL_NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden h-full w-64 shrink-0 flex-col gap-1 border-r bg-card p-4 md:flex"
    >
      <div className="mb-4 px-2">
        <p className="text-sm font-semibold text-primary">Portal de Fornecedores</p>
        <p className="text-xs text-muted-foreground">Lifting Electric &amp; Instrumentation</p>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.href}>
            {item.enabled ? (
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground",
                )}
                aria-disabled="true"
                title="Disponível em uma próxima fatia do MVP"
              >
                {item.label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  em breve
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
