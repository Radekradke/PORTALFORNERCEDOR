import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listInspections } from "@/modules/inspections/services/inspection-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InspectionStatusBadge } from "@/components/layout/status-badges";
import { INSPECTION_STATUS_LABELS } from "@/components/layout/nav-config";
import { formatDateTime } from "@/lib/time";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { status?: string; pagina?: string };
}) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "inspection.view")) {
    return <Forbidden />;
  }

  const page = Number(searchParams.pagina ?? "1") || 1;
  const { items, total, pageSize } = await listInspections(actor, { status: searchParams.status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canManage = authorize(actor, "inspection.manage");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fiscalizações</h1>
          <p className="text-muted-foreground">Programação, execução e resultado das fiscalizações (RF-075).</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/fiscalizacoes/novo">Nova fiscalização</Link>
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
            {Object.entries(INSPECTION_STATUS_LABELS).map(([value, label]) => (
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
            <TableHead>Data</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Checklist</TableHead>
            <TableHead>Fiscal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Conformidade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhuma fiscalização encontrada para o filtro informado.
              </TableCell>
            </TableRow>
          )}
          {items.map((inspection) => (
            <TableRow key={inspection.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(inspection.scheduledAt)}</TableCell>
              <TableCell className="font-medium">
                <Link href={`/fiscalizacoes/${inspection.id}`} className="hover:underline">
                  {inspection.supplier.legalName}
                </Link>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{inspection.template?.title ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{inspection.inspector.name}</TableCell>
              <TableCell>
                <InspectionStatusBadge status={inspection.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {inspection.conformityPercentage !== null ? `${Math.round(inspection.conformityPercentage)}%` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} — {total} fiscalizações.
      </p>
    </div>
  );
}
