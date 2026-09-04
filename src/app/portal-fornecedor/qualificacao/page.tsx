import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { getQualificationOverview } from "@/modules/qualifications/services/qualification-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QualificationStatusBadge } from "@/components/layout/status-badges";
import { QUALIFICATION_RESULT_LABELS } from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";

const STATUS_COPY: Record<string, string> = {
  NAO_INICIADA: "O processo de qualificação inicia automaticamente assim que seu cadastro é validado pela Lifting.",
  DOCUMENTACAO_PENDENTE: "Há documentos obrigatórios pendentes, rejeitados ou vencidos. Veja em Documentos.",
  EM_VALIDACAO: "Seus documentos obrigatórios estão em ordem. A equipe da Lifting está avaliando a qualificação.",
  APROVADO: "Sua empresa está qualificada.",
  APROVADO_COM_RESSALVAS: "Sua empresa está qualificada, com condições — veja os detalhes da ressalva abaixo.",
  REPROVADO: "Sua empresa não foi qualificada nesta rodada. Veja o motivo abaixo.",
  EM_REQUALIFICACAO: "Uma nova rodada de qualificação foi aberta.",
};

export default async function PortalQualificacaoPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const qualification = await getQualificationOverview(actor, actor.supplierId);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Qualificação</h1>
        <p className="text-muted-foreground">Resultado e histórico do processo de qualificação da sua empresa.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Situação atual</CardTitle>
          <QualificationStatusBadge status={qualification.status} />
        </CardHeader>
        <CardContent className="text-sm">
          <p>{STATUS_COPY[qualification.status] ?? ""}</p>
        </CardContent>
      </Card>

      {qualification.rounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de rodadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {qualification.rounds.map((round) => (
              <div key={round.id} className="rounded-md border p-3">
                <p className="font-medium">
                  Rodada {round.round} — iniciada em {formatDateTime(round.startedAt)}
                </p>
                {round.result ? (
                  <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
                    <p>
                      {QUALIFICATION_RESULT_LABELS[round.result] ?? round.result} em{" "}
                      {round.decidedAt ? formatDateTime(round.decidedAt) : "—"}
                    </p>
                    <p>{round.decisionReason}</p>
                    {round.result === "APROVADO_COM_RESSALVAS" && (
                      <div className="mt-1 rounded-md border border-dashed p-2">
                        <p>Condição: {round.conditionText}</p>
                        {round.conditionDeadline && <p>Prazo: {formatDate(round.conditionDeadline)}</p>}
                        {round.conditionEffect && <p>Efeito: {round.conditionEffect}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Em andamento.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
