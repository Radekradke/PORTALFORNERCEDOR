import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { listNonConformities } from "@/modules/nonconformities/services/nc-service";
import { isOverdue } from "@/modules/nonconformities/services/nc-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NcStatusBadge, CriticalityBadge, OverdueBadge } from "@/components/layout/status-badges";
import { formatDate } from "@/lib/time";

export default async function PortalNonConformitiesPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const { items } = await listNonConformities(actor, { pageSize: 50 });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Não conformidades e planos</h1>
        <p className="text-muted-foreground">Descrição, evidências, gravidade, prazo e responsável interno.</p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma não conformidade registrada até o momento.
          </CardContent>
        </Card>
      )}

      {items.map((nc) => (
        <Link key={nc.id} href={`/portal-fornecedor/nao-conformidades/${nc.id}`}>
          <Card className="hover:bg-accent/40">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-mono text-base">{nc.code}</CardTitle>
              <div className="flex gap-2">
                <CriticalityBadge criticality={nc.severity} />
                <NcStatusBadge status={nc.status} />
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Prazo: {formatDate(nc.deadline)}</span>
              <OverdueBadge overdue={isOverdue(nc.status, nc.deadline)} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
