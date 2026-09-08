import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { Forbidden } from "@/components/layout/forbidden";
import { listNotifications } from "@/modules/notifications/services/notification-service";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function InternalNotificationsPage({
  searchParams,
}: {
  searchParams: { naoLidas?: string; pagina?: string };
}) {
  const actor = await getCurrentActor();
  if (!actor) return <Forbidden />;

  const unreadOnly = searchParams.naoLidas === "1";
  const page = Number(searchParams.pagina ?? "1") || 1;
  const { items, total, pageSize } = await listNotifications(actor, { unreadOnly, page });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <p className="text-muted-foreground">
          Avisos dos eventos que envolvem você diretamente — o registro oficial de cada evento
          continua sendo a própria tela do fornecedor/documento/NC (RN-022).
        </p>
      </div>
      <NotificationList
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        unreadOnly={unreadOnly}
        basePath="/notificacoes"
      />
    </div>
  );
}
