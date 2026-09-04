import { QualificationStatusBadge } from "@/components/layout/status-badges";
import { QUALIFICATION_RESULT_LABELS } from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";
import { ReasonActionButton } from "@/components/forms/reason-action-button";
import { startRequalificationAction } from "@/modules/qualifications/actions/qualification-actions";
import { QualificationDecisionForm } from "./qualification-decision-form";

interface QualificationRound {
  id: string;
  round: number;
  startedAt: Date | string;
  startedBy: { name: string };
  result: string | null;
  decidedAt: Date | string | null;
  decidedBy: { name: string } | null;
  decisionReason: string | null;
  conditionText: string | null;
  conditionResponsible: string | null;
  conditionDeadline: Date | string | null;
  conditionEffect: string | null;
}

export function QualificationSection({
  supplierId,
  status,
  rounds,
  latestRound,
  canDecideNow,
  canApproveNormally,
  pendingObligatory,
  canDecide,
  canManage,
}: {
  supplierId: string;
  status: string;
  rounds: QualificationRound[];
  latestRound: QualificationRound | null;
  canDecideNow: boolean;
  canApproveNormally: boolean;
  pendingObligatory: { requirementTypeId: string; name: string; complianceStatus: string }[];
  canDecide: boolean;
  canManage: boolean;
}) {
  if (!latestRound) {
    return (
      <p className="text-sm text-muted-foreground">
        Qualificação ainda não iniciada — a 1ª rodada é criada automaticamente quando o cadastro é validado (RF-060).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <QualificationStatusBadge status={status} />
        <span className="text-xs text-muted-foreground">Rodada {latestRound.round}</span>
      </div>

      {!canApproveNormally && !latestRound.result && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium">Requisitos obrigatórios pendentes (RN-010):</p>
          <ul className="mt-1 list-inside list-disc">
            {pendingObligatory.map((p) => (
              <li key={p.requirementTypeId}>{p.name}</li>
            ))}
          </ul>
        </div>
      )}

      {canDecide && canDecideNow && (
        <QualificationDecisionForm
          qualificationId={latestRound.id}
          supplierId={supplierId}
          canApproveNormally={canApproveNormally}
        />
      )}

      {canManage && !canDecideNow && (
        <ReasonActionButton
          action={startRequalificationAction}
          hiddenFields={{ supplierId }}
          label="Iniciar nova rodada (requalificação)"
          reasonLabel="Motivo da requalificação (vencimento, mudança ou periodicidade — RF-065)"
        />
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Rodadas</p>
        {rounds.map((round) => (
          <div key={round.id} className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                Rodada {round.round} — iniciada em {formatDateTime(round.startedAt)} por {round.startedBy.name}
              </p>
              {round.result && <QualificationStatusBadge status={round.result} />}
            </div>
            {round.result ? (
              <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                <p>
                  {QUALIFICATION_RESULT_LABELS[round.result] ?? round.result} em{" "}
                  {round.decidedAt ? formatDateTime(round.decidedAt) : "—"}
                  {round.decidedBy ? ` por ${round.decidedBy.name}` : ""}
                </p>
                <p>Justificativa: {round.decisionReason}</p>
                {round.result === "APROVADO_COM_RESSALVAS" && (
                  <div className="mt-1 rounded-md border border-dashed p-2">
                    <p>Condição: {round.conditionText}</p>
                    {round.conditionDeadline && <p>Prazo: {formatDate(round.conditionDeadline)}</p>}
                    {round.conditionResponsible && <p>Responsável: {round.conditionResponsible}</p>}
                    {round.conditionEffect && <p>Efeito: {round.conditionEffect}</p>}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Aguardando decisão.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
