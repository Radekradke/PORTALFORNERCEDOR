import type { QualificationResult } from "@prisma/client";

/**
 * Estado "vigente" de qualificação do fornecedor (seção 5.2). Calculado na
 * leitura a partir da rodada mais recente — mesmo padrão já usado em
 * document-compliance.ts (VENCENDO/VENCIDO nunca são persistidos). Uma
 * rodada já decidida (result preenchido) nunca é recalculada: a decisão é
 * histórico imutável, mesmo que a realidade mude depois (documento vence,
 * requisito novo é criado) — isso é o que a requalificação manual existe
 * para tratar (RF-065), não um recômputo automático (consistente com D-07:
 * nenhum bloqueio/mudança automática de estado sem regra aprovada).
 */
export type QualificationOverallStatus =
  | "NAO_INICIADA"
  | "DOCUMENTACAO_PENDENTE"
  | "EM_VALIDACAO"
  | "APROVADO"
  | "APROVADO_COM_RESSALVAS"
  | "REPROVADO"
  | "EM_REQUALIFICACAO";

export interface QualificationRoundLike {
  round: number;
  result: QualificationResult | null;
}

export function computeQualificationStatus(
  latestRound: QualificationRoundLike | null,
  openRoundHasPendingObligatory: boolean,
): QualificationOverallStatus {
  if (!latestRound) return "NAO_INICIADA";
  if (latestRound.result) return latestRound.result;
  // Rodada aberta além da primeira só existe por requalificação manual
  // (startRequalification) — o rótulo "Em requalificação" da seção 5.2 é
  // justamente essa rodada > 1 ainda sem decisão.
  if (latestRound.round > 1) return "EM_REQUALIFICACAO";
  return openRoundHasPendingObligatory ? "DOCUMENTACAO_PENDENTE" : "EM_VALIDACAO";
}

/**
 * RN-010, RF-066, CA-09: aprovação normal (sem ressalva) exige todos os
 * requisitos obrigatórios atendidos — nenhuma exceção automática.
 */
export function canApproveNormally(pendingObligatoryCount: number): boolean {
  return pendingObligatoryCount === 0;
}
