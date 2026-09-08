import Link from "next/link";
import { logoutAction } from "@/modules/auth-access/actions/logout-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "./nav-config";
import type { Actor } from "@/modules/auth-access/domain/actor";

interface TopbarProps {
  actor: Actor;
  notificationsHref?: string;
  unreadCount?: number;
}

/** RF-116: sino com contagem de não lidas — link para a central de notificações do próprio perfil. */
export function Topbar({ actor, notificationsHref, unreadCount = 0 }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b bg-background px-4 sm:px-6">
      {notificationsHref && (
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={notificationsHref}>
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Link>
        </Button>
      )}
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
