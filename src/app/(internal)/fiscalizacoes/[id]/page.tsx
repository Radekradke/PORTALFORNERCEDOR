import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getInspectionDetail } from "@/modules/inspections/services/inspection-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InspectionStatusBadge } from "@/components/layout/status-badges";
import { formatCnpj } from "@/lib/cnpj";
import { formatDateTime } from "@/lib/time";
import { AnswerItemForm } from "./answer-item-form";
import { ConcludeButton } from "./conclude-button";
import { ReasonActionButton } from "@/components/forms/reason-action-button";
import { cancelInspectionAction } from "@/modules/inspections/actions/inspection-actions";

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "inspection.view")) {
    return <Forbidden />;
  }

  const inspection = await getInspectionDetail(actor, params.id);
  if (!inspection) notFound();

  const canManage = authorize(actor, "inspection.manage");
  const editable = inspection.status === "PROGRAMADA" || inspection.status === "EM_ANDAMENTO";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{inspection.supplier.legalName}</h1>
        <p className="text-muted-foreground">
          {inspection.template?.title ?? "Checklist"} · {formatDateTime(inspection.scheduledAt)} · Fiscal:{" "}
          {inspection.inspector.name}
        </p>
        {inspection.projectOrLocation && (
          <p className="text-sm text-muted-foreground">Local/projeto: {inspection.projectOrLocation}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <InspectionStatusBadge status={inspection.status} />
        </div>
      </div>

      {inspection.status === "CONCLUIDA" && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-semibold">
              {inspection.conformityPercentage !== null ? `${Math.round(inspection.conformityPercentage)}%` : "—"}{" "}
              <span className="text-sm font-normal text-muted-foreground">de conformidade (RN-015)</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Conforme: {inspection.evaluation.counts.CONFORME} · Com ressalva:{" "}
              {inspection.evaluation.counts.CONFORME_COM_RESSALVA} · Não conforme:{" "}
              {inspection.evaluation.counts.NAO_CONFORME} · Não aplicável: {inspection.evaluation.counts.NAO_APLICAVEL}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Concluída em {inspection.concludedAt ? formatDateTime(inspection.concludedAt) : "—"}
              {inspection.concludedBy ? ` por ${inspection.concludedBy.name}` : ""}. Respostas imutáveis (RN-019).
            </p>
          </CardContent>
        </Card>
      )}

      {inspection.status === "CANCELADA" && (
        <Card>
          <CardHeader>
            <CardTitle>Cancelada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Motivo: {inspection.cancelReason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {inspection.cancelledAt ? formatDateTime(inspection.cancelledAt) : "—"}
              {inspection.cancelledBy ? ` por ${inspection.cancelledBy.name}` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      {editable && !inspection.evaluation.canConclude && (
        <p className="text-sm text-muted-foreground">
          Progresso: {inspection.evaluation.answeredItems} de {inspection.evaluation.totalItems} itens respondidos.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {inspection.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {section.items.map((item) => {
                const existing = inspection.answersByItem.get(item.id);
                if (!editable) {
                  return (
                    <div key={item.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{item.text}</p>
                      <p className="mt-1 text-xs">
                        Resposta: {existing?.response ?? "—"}
                        {existing?.observation && ` — ${existing.observation}`}
                      </p>
                      {existing && existing.evidences.length > 0 && (
                        <div className="mt-1 flex flex-col gap-1 text-xs">
                          {existing.evidences.map((e) => (
                            <a
                              key={e.id}
                              href={`/api/evidencias/${e.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline underline-offset-4"
                            >
                              {e.fileObject.originalName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <AnswerItemForm
                    key={item.id}
                    inspectionId={inspection.id}
                    item={item}
                    existingAnswer={
                      existing
                        ? {
                            response: existing.response,
                            observation: existing.observation,
                            evidences: existing.evidences.map((e) => ({ id: e.id, originalName: e.fileObject.originalName })),
                          }
                        : undefined
                    }
                  />
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && editable && (
        <Card>
          <CardHeader>
            <CardTitle>Concluir ou cancelar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ConcludeButton inspectionId={inspection.id} />
            <ReasonActionButton
              action={cancelInspectionAction}
              hiddenFields={{ inspectionId: inspection.id }}
              label="Cancelar fiscalização"
              variant="destructive"
              reasonLabel="Motivo do cancelamento (RF-082)"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
