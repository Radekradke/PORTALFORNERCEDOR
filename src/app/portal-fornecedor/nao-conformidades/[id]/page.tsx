import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { getNonConformityDetail } from "@/modules/nonconformities/services/nc-service";
import { isOverdue } from "@/modules/nonconformities/services/nc-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NcStatusBadge, CriticalityBadge, OverdueBadge } from "@/components/layout/status-badges";
import { ACTION_PLAN_DECISION_LABELS, VERIFICATION_DECISION_LABELS } from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";
import { ActionPlanForm } from "./action-plan-form";
import { CorrectionEvidenceForm } from "./correction-evidence-form";
import { SubmitForVerificationButton } from "./submit-for-verification-button";

export default async function PortalNonConformityDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const nc = await getNonConformityDetail(actor, params.id);
  if (!nc) notFound();

  const overdue = isOverdue(nc.status, nc.deadline);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold">{nc.code}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <NcStatusBadge status={nc.status} />
          <CriticalityBadge criticality={nc.severity} />
          <OverdueBadge overdue={overdue} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>{nc.description}</p>
          <p className="text-xs text-muted-foreground">Prazo: {formatDate(nc.deadline)}</p>
          {nc.evidences.length > 0 && (
            <div className="mt-1 flex flex-col gap-1 text-xs">
              <p className="text-muted-foreground">Evidências</p>
              {nc.evidences.map((e) => (
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
        </CardContent>
      </Card>

      {nc.status === "AGUARDANDO_PLANO" && (
        <Card>
          <CardHeader>
            <CardTitle>Plano de ação (RF-094)</CardTitle>
          </CardHeader>
          <CardContent>
            {nc.actionPlan?.reviewDecision && nc.actionPlan.reviewDecision !== "ACEITO" && (
              <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="font-medium">{ACTION_PLAN_DECISION_LABELS[nc.actionPlan.reviewDecision]}</p>
                <p className="text-xs text-muted-foreground">{nc.actionPlan.reviewReason}</p>
              </div>
            )}
            <ActionPlanForm
              ncId={nc.id}
              cause={nc.actionPlan?.cause}
              correctiveAction={nc.actionPlan?.correctiveAction}
              responsibleName={nc.actionPlan?.responsibleName}
              proposedDeadline={nc.actionPlan?.proposedDeadline?.toISOString().slice(0, 10)}
            />
          </CardContent>
        </Card>
      )}

      {nc.status === "PLANO_EM_ANALISE" && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Plano enviado em {nc.actionPlan?.submittedAt ? formatDateTime(nc.actionPlan.submittedAt) : "—"}, aguardando
            análise.
          </CardContent>
        </Card>
      )}

      {(nc.status === "EM_CORRECAO" || nc.status === "AGUARDANDO_VERIFICACAO") && nc.actionPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Plano aceito</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>{nc.actionPlan.correctiveAction}</p>
            {nc.actionPlan.evidences.length > 0 && (
              <div className="flex flex-col gap-1 text-xs">
                <p className="text-muted-foreground">Evidências de correção enviadas:</p>
                {nc.actionPlan.evidences.map((e) => (
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
            {nc.status === "EM_CORRECAO" && (
              <>
                <CorrectionEvidenceForm ncId={nc.id} />
                <SubmitForVerificationButton ncId={nc.id} />
              </>
            )}
            {nc.status === "AGUARDANDO_VERIFICACAO" && (
              <p className="text-xs text-muted-foreground">Aguardando verificação da Lifting.</p>
            )}
          </CardContent>
        </Card>
      )}

      {nc.status === "ENCERRADA" && (
        <Card>
          <CardHeader>
            <CardTitle>Encerrada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-xs text-muted-foreground">
              Encerrada em {nc.closedAt ? formatDateTime(nc.closedAt) : "—"}.
            </p>
            {nc.actionPlan?.verificationDecision && (
              <p className="mt-1 text-xs text-muted-foreground">
                Verificação: {VERIFICATION_DECISION_LABELS[nc.actionPlan.verificationDecision]}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
