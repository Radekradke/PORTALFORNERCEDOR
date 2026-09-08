/**
 * RF-113, RN-023, seção 9.1: Índice de Conformidade Operacional (ICO) — a
 * fórmula abaixo é a PROPOSTA da especificação, ainda não aprovada pelo
 * dono do processo (D-09). Por isso todo lugar que exibe o ICO precisa
 * deixar claro que é informativo, mostrar a fórmula e a "memória de
 * cálculo" (RN-023) — nunca usar o valor para bloquear ou decidir nada
 * automaticamente (RN-016, D-07).
 */

export interface IcoComponents {
  /** Requisitos obrigatórios com versão vigente aprovada / requisitos obrigatórios aplicáveis (0-100). */
  documentationScore: number;
  /** Média ponderada das fiscalizações concluídas nos últimos 12 meses (0-100, = % de conformidade). */
  inspectionScore: number;
  /** Nota por NCs abertas — quantidade, gravidade e atraso (0-100, 100 = nenhuma NC problemática). */
  nonConformityScore: number;
}

export const ICO_WEIGHTS = {
  documentation: 0.4,
  inspection: 0.4,
  nonConformity: 0.2,
} as const;

export interface IcoResult extends IcoComponents {
  score: number | null; // null quando não há dado suficiente em nenhum componente
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** RN-015-like: aprovados/aplicáveis, ou null se não há requisito obrigatório aplicável. */
export function documentationScore(approvedCount: number, applicableCount: number): number | null {
  if (applicableCount === 0) return null;
  return clamp((approvedCount / applicableCount) * 100);
}

/** Média simples do % de conformidade das fiscalizações concluídas no período — ou null se nenhuma. */
export function inspectionScore(conformityPercentages: number[]): number | null {
  if (conformityPercentages.length === 0) return null;
  const sum = conformityPercentages.reduce((acc, v) => acc + v, 0);
  return clamp(sum / conformityPercentages.length);
}

/**
 * Nota por NCs abertas: 100 (sem NC aberta) menos uma penalidade por NC
 * ponderada pela gravidade, com peso extra se estiver vencida. Sem base
 * aprovada para os pesos exatos (D-09) — os valores abaixo são um ponto de
 * partida razoável e documentado, nunca definitivo.
 */
const SEVERITY_PENALTY: Record<string, number> = {
  BAIXA: 5,
  MEDIA: 10,
  ALTA: 20,
  CRITICA: 35,
};

export function nonConformityScore(openNcs: Array<{ severity: string; overdue: boolean }>): number {
  if (openNcs.length === 0) return 100;
  const penalty = openNcs.reduce((acc, nc) => {
    const base = SEVERITY_PENALTY[nc.severity] ?? 10;
    return acc + (nc.overdue ? base * 1.5 : base);
  }, 0);
  return clamp(100 - penalty);
}

/** Combina os três componentes pela ponderação proposta (40/40/20) — ignora componentes sem dado (null). */
export function computeIco(components: {
  documentationScore: number | null;
  inspectionScore: number | null;
  nonConformityScore: number | null;
}): IcoResult {
  const parts: Array<{ value: number; weight: number }> = [];
  if (components.documentationScore !== null) parts.push({ value: components.documentationScore, weight: ICO_WEIGHTS.documentation });
  if (components.inspectionScore !== null) parts.push({ value: components.inspectionScore, weight: ICO_WEIGHTS.inspection });
  if (components.nonConformityScore !== null) parts.push({ value: components.nonConformityScore, weight: ICO_WEIGHTS.nonConformity });

  const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0);
  const score = totalWeight === 0 ? null : clamp(parts.reduce((acc, p) => acc + p.value * p.weight, 0) / totalWeight);

  return {
    documentationScore: components.documentationScore ?? 0,
    inspectionScore: components.inspectionScore ?? 0,
    nonConformityScore: components.nonConformityScore ?? 0,
    score,
  };
}
