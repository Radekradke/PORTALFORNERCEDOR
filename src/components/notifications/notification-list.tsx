import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkReadButton, MarkAllReadButton } from "./mark-read-buttons";
import { formatDateTime } from "@/lib/time";
import type { Notification } from "@prisma/client";

/** RF-116, EXT-08/INT: lista de notificações — usada tanto no portal interno quanto no do fornecedor. */
export function NotificationList({
  items,
  total,
  page,
  pageSize,
  unreadOnly,
  basePath,
}: {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadOnly: boolean;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          <Link
            href={basePath}
            className={`rounded-md px-3 py-1.5 ${!unreadOnly ? "bg-primary text-primary-foreground" : "border border-input"}`}
          >
            Todas
          </Link>
          <Link
            href={`${basePath}?naoLidas=1`}
            className={`rounded-md px-3 py-1.5 ${unreadOnly ? "bg-primary text-primary-foreground" : "border border-input"}`}
          >
            Não lidas
          </Link>
        </div>
        <MarkAllReadButton />
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma notificação {unreadOnly ? "não lida" : ""} por aqui.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <Card key={n.id} className={n.readAt ? "opacity-70" : "border-primary/40"}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!n.readAt && <Badge variant="default">Nova</Badge>}
                  <Link href={n.link} className="font-medium hover:underline">
                    {n.title}
                  </Link>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
              </div>
              {!n.readAt && <MarkReadButton notificationId={n.id} />}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} — {total} notificação(ões).
      </p>
    </div>
  );
}
