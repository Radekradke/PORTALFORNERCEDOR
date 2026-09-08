import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listNonConformities } from "@/modules/nonconformities/services/nc-service";
import { isOverdue } from "@/modules/nonconformities/services/nc-status";
import { Forbidden } from "@/components/layout/forbidden";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NcStatusBadge, CriticalityBadge, OverdueBadge } from "@/components/layout/status-badges";
import { NC_STATUS_LABELS } from "@/components/layout/nav-config";
import { formatDate } from "@/lib/time";

export default async function NonConformitiesPage({
  searchParams,
}: {
  searchParams: { status?: string; pagina?: string };
}) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "nc.view")) {
    return <Forbidden />;
  }

  const page = Number(searchParams.pagina ?? "1") || 1;
  const { items, total, pageSize } = await listNonConformities(actor, { status: searchParams.status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canManage = authorize(actor, "nc.manage");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Não conformidades</h1>
          <p className="text-muted-foreground">
            NCs abertas manualmente ou a partir de fiscalizações, com plano de ação e verificação
            (RF-090 a RF-099).
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/nao-conformidades/novo">Nova NC</Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(NC_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">
          Filtrar
        </button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Gravidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma não conformidade encontrada para o filtro informado.
              </TableCell>
            </TableRow>
          )}
          {items.map((nc) => (
            <TableRow key={nc.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/nao-conformidades/${nc.id}`} className="font-medium hover:underline">
                  {nc.code}
                </Link>
              </TableCell>
              <TableCell>{nc.supplier.legalName}</TableCell>
              <TableCell>
                <CriticalityBadge criticality={nc.severity} />
              </TableCell>
              <TableCell>
                <NcStatusBadge status={nc.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">
                {formatDate(nc.deadline)} <OverdueBadge overdue={isOverdue(nc.status, nc.deadline)} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{nc.responsibleInternal.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} — {total} não conformidades.
      </p>
    </div>
  );
}
