import { logoutAction } from "@/modules/auth-access/actions/logout-action";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "./nav-config";
import type { Actor } from "@/modules/auth-access/domain/actor";

export function Topbar({ actor }: { actor: Actor }) {
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b bg-background px-4 sm:px-6">
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium leading-tight">{actor.name}</p>
        <p className="truncate text-xs text-muted-foreground leading-tight">{ROLE_LABELS[actor.role]}</p>
      </div>
      <form action={logoutAction} className="shrink-0">
        <Button type="submit" variant="outline" size="sm">
          Sair
        </Button>
      </form>
    </header>
  );
}
