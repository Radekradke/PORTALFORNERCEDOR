import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { listSupplierExternalHistory } from "@/modules/audit/services/audit-query-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/time";

export default async function PortalHistoricoPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const events = await listSupplierExternalHistory(actor, actor.supplierId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-muted-foreground">
          Linha do tempo com os eventos relevantes do seu cadastro (RF-136).
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/hora</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhum evento registrado ainda.
              </TableCell>
            </TableRow>
          )}
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(event.createdAt)}</TableCell>
              <TableCell className="text-xs">{event.action}</TableCell>
              <TableCell className="text-xs">{event.reason ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
