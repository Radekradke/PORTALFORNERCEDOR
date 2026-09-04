import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listAuditLogs } from "@/modules/audit/services/audit-query-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; entidade?: string; pagina?: string };
}) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "audit.view")) {
    return <Forbidden />;
  }

  const page = Number(searchParams.pagina ?? "1") || 1;
  const { items, total, pageSize } = await listAuditLogs(actor, {
    action: searchParams.action,
    entityType: searchParams.entidade,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted-foreground">
          Trilha imutável de eventos críticos: login, permissões, decisões e alterações sensíveis.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="action" className="text-xs font-medium">
            Ação contém
          </label>
          <input
            id="action"
            name="action"
            defaultValue={searchParams.action}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="ex.: auth.login"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="entidade" className="text-xs font-medium">
            Entidade
          </label>
          <input
            id="entidade"
            name="entidade"
            defaultValue={searchParams.entidade}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="ex.: User"
          />
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Filtrar
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/hora</TableHead>
            <TableHead>Ator</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum evento encontrado para o filtro informado.
              </TableCell>
            </TableRow>
          )}
          {items.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</TableCell>
              <TableCell className="text-xs">
                {log.actor ? `${log.actor.name} (${log.actor.email})` : log.actorLabel ?? "Sistema"}
              </TableCell>
              <TableCell className="font-mono text-xs">{log.action}</TableCell>
              <TableCell className="text-xs">
                {log.entityType}
                {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
              </TableCell>
              <TableCell className="text-xs">{log.reason ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} — {total} eventos.
      </p>
    </div>
  );
}
