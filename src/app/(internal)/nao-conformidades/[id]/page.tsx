import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getNonConformityDetail, listAssignableNcResponsibles } from "@/modules/nonconformities/services/nc-service";
import { listCategories } from "@/modules/categories/services/category-service";
import { isOverdue } from "@/modules/nonconformities/services/nc-status";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NcStatusBadge, CriticalityBadge, OverdueBadge } from "@/components/layout/status-badges";
import {
  NC_ORIGIN_LABELS,
  ACTION_PLAN_DECISION_LABELS,
  VERIFICATION_METHOD_LABELS,
  VERIFICATION_DECISION_LABELS,
} from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";
import { ReasonActionButton } from "@/components/forms/reason-action-button";
import { openNonConformityAction } from "@/modules/nonconformities/actions/nc-actions";
import { DraftEditForm } from "./draft-edit-form";
import { PlanReviewForm } from "./plan-review-form";
import { VerifyForm } from "./verify-form";
import { ReopenForm } from "./reopen-form";

export default async function NonConformityDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "nc.view")) {
    return <Forbidden />;
  }

  const nc = await getNonConformityDetail(actor, params.id);
  if (!nc) notFound();

  const canManage = authorize(actor, "nc.manage");
  const canDecide = authorize(actor, "nc.decide");
  const canVerify = authorize(actor, "nc.verify");
  const canReopen = authorize(actor, "nc.reopen");
  const canSuspend = authorize(actor, "supplier.suspend");

  const responsibles = canManage ? await listAssignableNcResponsibles(actor) : [];
  const categories = canManage ? await listCategories(actor) : [];

  const overdue = isOverdue(nc.status, nc.deadline);
  const suggestSuspension = overdue && nc.severity === "CRITICA" && nc.status !== "ENCERRADA";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/fornecedores/${nc.supplier.id}`} className="hover:underline">
            {nc.supplier.legalName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">{nc.code}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <NcStatusBadge status={nc.status} />
          <CriticalityBadge criticality={nc.severity} />
          <OverdueBadge overdue={overdue} />
        </div>
      </div>

      {suggestSuspension && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <p>
              <strong>Sugestão (RF-099):</strong> NC crítica vencida — considere suspender o fornecedor. A
              efetivação exige decisão de usuário autorizado (RN-016).
            </p>
            {canSuspend && (
              <Link href={`/fornecedores/${nc.supplier.id}`} className="shrink-0 text-primary underline underline-offset-4">
                Ir para o fornecedor
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {nc.status === "ABERTA" && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Rascunho automático (CA-14)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Gerada a partir de um item não conforme da fiscalização. Ainda não é visível ao fornecedor —
              confirme os dados e abra quando estiver pronta.
            </p>
            <DraftEditForm
              ncId={nc.id}
              severity={nc.severity}
              categoryId={nc.categoryId}
              description={nc.description}
              responsibleInternalId={nc.responsibleInternalId}
              deadline={nc.deadline.toISOString().slice(0, 10)}
              categories={categories.map((c) => ({ id: c.id, label: c.name }))}
              responsibles={responsibles.map((r) => ({ id: r.id, label: `${r.name} (${r.email})` }))}
            />
            <ReasonActionButton
              action={openNonConformityAction}
              hiddenFields={{ ncId: nc.id }}
              label="Confirmar e abrir para o fornecedor"
              variant="default"
              requireReason={false}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <p className="text-muted-foreground">Descrição</p>
            <p className="font-medium">{nc.description}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Origem</p>
            <p className="font-medium">{NC_ORIGIN_LABELS[nc.origin]}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Categoria</p>
            <p className="font-medium">{nc.category?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Responsável interno</p>
            <p className="font-medium">{nc.responsibleInternal.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prazo</p>
            <p className="font-medium">{formatDate(nc.deadline)}</p>
          </div>
          {nc.inspectionId && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Fiscalização de origem</p>
              <Link href={`/fiscalizacoes/${nc.inspectionId}`} className="font-medium text-primary hover:underline">
                Ver fiscalização
              </Link>
            </div>
          )}
          {nc.inspectionAnswer && nc.inspectionAnswer.evidences.length > 0 && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Evidências da origem</p>
              <div className="mt-1 flex flex-col gap-1">
                {nc.inspectionAnswer.evidences.map((e) => (
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano de ação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {!nc.actionPlan && <p className="text-muted-foreground">Fornecedor ainda não enviou um plano.</p>}

          {nc.actionPlan && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Causa</p>
                  <p className="font-medium">{nc.actionPlan.cause ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ação corretiva</p>
                  <p className="font-medium">{nc.actionPlan.correctiveAction ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Responsável (fornecedor)</p>
                  <p className="font-medium">{nc.actionPlan.responsibleName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prazo proposto</p>
                  <p className="font-medium">
                    {nc.actionPlan.proposedDeadline ? formatDate(nc.actionPlan.proposedDeadline) : "—"}
                  </p>
                </div>
              </div>

              {nc.actionPlan.submittedAt && (
                <p className="text-xs text-muted-foreground">Enviado em {formatDateTime(nc.actionPlan.submittedAt)}</p>
              )}

              {nc.actionPlan.reviewDecision && (
                <div className="rounded-md border p-2 text-xs">
                  <p>
                    <strong>{ACTION_PLAN_DECISION_LABELS[nc.actionPlan.reviewDecision]}</strong>
                    {nc.actionPlan.reviewedBy ? ` — ${nc.actionPlan.reviewedBy.name}` : ""}
                    {nc.actionPlan.reviewedAt ? ` em ${formatDateTime(nc.actionPlan.reviewedAt)}` : ""}
                  </p>
                  {nc.actionPlan.reviewReason && <p className="mt-1">{nc.actionPlan.reviewReason}</p>}
                </div>
              )}

              {nc.actionPlan.evidences.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Evidências de correção</p>
                  <div className="mt-1 flex flex-col gap-1">
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
                </div>
              )}

              {nc.actionPlan.readyForVerificationAt && (
                <p className="text-xs text-muted-foreground">
                  Fornecedor sinalizou correção concluída em {formatDateTime(nc.actionPlan.readyForVerificationAt)}.
                </p>
              )}

              {nc.actionPlan.verificationDecision && (
                <div className="rounded-md border p-2 text-xs">
                  <p>
                    <strong>Verificação {VERIFICATION_DECISION_LABELS[nc.actionPlan.verificationDecision]}</strong>
                    {nc.actionPlan.verificationMethod && ` (${VERIFICATION_METHOD_LABELS[nc.actionPlan.verificationMethod]})`}
                    {nc.actionPlan.verifiedBy ? ` — ${nc.actionPlan.verifiedBy.name}` : ""}
                  </p>
                  {nc.actionPlan.verificationNote && <p className="mt-1">{nc.actionPlan.verificationNote}</p>}
                </div>
              )}
            </>
          )}

          {nc.status === "PLANO_EM_ANALISE" && canDecide && <PlanReviewForm ncId={nc.id} />}
          {nc.status === "AGUARDANDO_VERIFICACAO" && canVerify && <VerifyForm ncId={nc.id} />}
        </CardContent>
      </Card>

      {nc.status === "ENCERRADA" && (
        <Card>
          <CardHeader>
            <CardTitle>Encerramento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Encerrada em {nc.closedAt ? formatDateTime(nc.closedAt) : "—"}
              {nc.closedBy ? ` por ${nc.closedBy.name}` : ""}.
            </p>
            {nc.reopenedAt && (
              <p className="text-xs text-muted-foreground">
                Reaberta anteriormente em {formatDateTime(nc.reopenedAt)}
                {nc.reopenedBy ? ` por ${nc.reopenedBy.name}` : ""}: {nc.reopenReason}
              </p>
            )}
            {canReopen && <ReopenForm ncId={nc.id} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
