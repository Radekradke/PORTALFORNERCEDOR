import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { listInspections } from "@/modules/inspections/services/inspection-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/time";

export default async function PortalInspectionsPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const { items } = await listInspections(actor, { pageSize: 50 });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fiscalizações</h1>
        <p className="text-muted-foreground">
          Resultados das fiscalizações concluídas na sua empresa (RF-133, EXT-05).
        </p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhuma fiscalização concluída até o momento.
          </CardContent>
        </Card>
      )}

      {items.map((inspection) => (
        <Link key={inspection.id} href={`/portal-fornecedor/fiscalizacoes/${inspection.id}`}>
          <Card className="hover:bg-accent/40">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{inspection.template?.title ?? "Checklist"}</CardTitle>
              <span className="text-lg font-semibold">
                {inspection.conformityPercentage !== null ? `${Math.round(inspection.conformityPercentage)}%` : "—"}
              </span>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{formatDateTime(inspection.scheduledAt)}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
