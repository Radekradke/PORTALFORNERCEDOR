import type { DocumentVersion } from "@prisma/client";

/**
 * Estado de conformidade calculado na leitura (nunca persistido): não há
 * job de vencimento diário nesta fatia (ver docs/DECISOES_PENDENTES.md), e
 * calcular a partir de `validUntil` mantém o valor sempre correto sem
 * depender de uma tarefa agendada rodando.
 */
export type DocumentComplianceStatus =
  | "NAO_APLICAVEL"
  | "PENDENTE"
  | "AGUARDANDO_ANALISE"
  | "REJEITADO"
  | "ATENDIDO"
  | "VENCENDO"
  | "VENCIDO";

export interface ComplianceResult {
  status: DocumentComplianceStatus;
  /** Versão vigente (RN-006): a mais recente aprovada, mesmo com uma versão nova ainda em análise. */
  currentVersion: DocumentVersion | null;
  /** Última versão enviada, independentemente do status — usada para saber se há algo em fila. */
  latestVersion: DocumentVersion | null;
  hasPendingReview: boolean;
}

export function computeDocumentCompliance(
  requirement: { applicable: boolean; obligation: string },
  versions: DocumentVersion[],
  alertWindowDays: number[],
  now: Date = new Date(),
): ComplianceResult {
  if (!requirement.applicable) {
    return { status: "NAO_APLICAVEL", currentVersion: null, latestVersion: null, hasPendingReview: false };
  }

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const latestVersion = sorted[0] ?? null;
  const currentVersion = sorted.find((v) => v.status === "APROVADO") ?? null;
  const hasPendingReview = sorted.some((v) => v.status === "ENVIADO" || v.status === "EM_ANALISE");

  if (currentVersion) {
    if (!currentVersion.validUntil) {
      return { status: "ATENDIDO", currentVersion, latestVersion, hasPendingReview };
    }
    const maxWindow = alertWindowDays.length > 0 ? Math.max(...alertWindowDays) : 0;
    const alertFrom = new Date(currentVersion.validUntil);
    alertFrom.setDate(alertFrom.getDate() - maxWindow);

    if (currentVersion.validUntil < now) {
      return { status: "VENCIDO", currentVersion, latestVersion, hasPendingReview };
    }
    if (alertFrom <= now) {
      return { status: "VENCENDO", currentVersion, latestVersion, hasPendingReview };
    }
    return { status: "ATENDIDO", currentVersion, latestVersion, hasPendingReview };
  }

  if (latestVersion) {
    if (latestVersion.status === "ENVIADO" || latestVersion.status === "EM_ANALISE") {
      return { status: "AGUARDANDO_ANALISE", currentVersion: null, latestVersion, hasPendingReview };
    }
    if (latestVersion.status === "REJEITADO") {
      return { status: "REJEITADO", currentVersion: null, latestVersion, hasPendingReview: false };
    }
  }

  return { status: "PENDENTE", currentVersion: null, latestVersion: null, hasPendingReview: false };
}
