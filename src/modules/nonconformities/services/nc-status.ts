import type { Criticality } from "@prisma/client";

/**
 * RN-017: prazos sugeridos por gravidade — "todos sujeitos à validação",
 * ou seja, só um valor inicial padrão, nunca travado (quem cria pode
 * sempre ajustar a data antes de salvar).
 */
const SUGGESTED_DEADLINE_DAYS: Record<Criticality, number> = {
  BAIXA: 30,
  MEDIA: 15,
  ALTA: 7,
  CRITICA: 1,
};

export function suggestedDeadlineDays(severity: Criticality): number {
  return SUGGESTED_DEADLINE_DAYS[severity];
}

export function suggestedDeadline(severity: Criticality, from: Date = new Date()): Date {
  const deadline = new Date(from);
  deadline.setDate(deadline.getDate() + suggestedDeadlineDays(severity));
  return deadline;
}

/**
 * RF-098: "vencida" é calculada na leitura (mesmo padrão de
 * document-compliance.ts e qualification-status.ts) — nunca persistida,
 * nunca aparece em NC já encerrada.
 */
export function isOverdue(status: string, deadline: Date | string, now: Date = new Date()): boolean {
  if (status === "ENCERRADA") return false;
  const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
  return deadlineDate.getTime() < now.getTime();
}
