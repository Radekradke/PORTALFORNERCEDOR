import type { InspectionResponse } from "@prisma/client";

/**
 * Item do checklist tal como congelado em `Inspection.checklistSnapshot`
 * (RF-074, RN-013). Nunca é a linha viva de `ChecklistItem`.
 */
export interface ChecklistItemSnapshot {
  id: string;
  text: string;
  guidance?: string | null;
  allowedResponses: InspectionResponse[];
  evidenceRequiredOn: InspectionResponse[];
  observationRequiredOn: InspectionResponse[];
  /** Preservados no snapshot para uso futuro (F6, criação de NC) — não consumidos nesta fatia. */
  generatesNonConformity?: boolean;
  defaultSeverity?: string | null;
}

export interface ChecklistSectionSnapshot {
  id: string;
  title: string;
  order: number;
  items: ChecklistItemSnapshot[];
}

export interface AnswerLike {
  itemId: string;
  response: InspectionResponse | null;
  observation: string | null;
  hasEvidence: boolean;
}

export type InspectionIssueReason = "SEM_RESPOSTA" | "EVIDENCIA_OBRIGATORIA" | "OBSERVACAO_OBRIGATORIA";

export interface InspectionIssue {
  itemId: string;
  reason: InspectionIssueReason;
}

export type ResponseCounts = Record<InspectionResponse, number>;

export interface InspectionEvaluation {
  /** RF-078: só pode concluir sem nenhuma pendência. */
  canConclude: boolean;
  issues: InspectionIssue[];
  /** RN-015: itens "conforme" / itens aplicáveis (exclui N/A) x 100. Null enquanto não dá para calcular. */
  conformityPercentage: number | null;
  counts: ResponseCounts;
  totalItems: number;
  answeredItems: number;
}

function flattenItems(sections: ChecklistSectionSnapshot[]): ChecklistItemSnapshot[] {
  return sections.flatMap((s) => s.items);
}

/**
 * RF-076 a RF-079: avalia o progresso/possibilidade de conclusão de uma
 * fiscalização a partir do checklist congelado e das respostas salvas até
 * o momento. Função pura — usada tanto para exibir progresso durante a
 * execução quanto para validar/calcular o resultado na conclusão.
 */
export function evaluateInspection(
  sections: ChecklistSectionSnapshot[],
  answers: AnswerLike[],
): InspectionEvaluation {
  const items = flattenItems(sections);
  const answerByItem = new Map(answers.map((a) => [a.itemId, a]));
  const issues: InspectionIssue[] = [];
  const counts: ResponseCounts = {
    CONFORME: 0,
    CONFORME_COM_RESSALVA: 0,
    NAO_CONFORME: 0,
    NAO_APLICAVEL: 0,
  };
  let answeredItems = 0;

  for (const item of items) {
    const answer = answerByItem.get(item.id);
    if (!answer || !answer.response) {
      issues.push({ itemId: item.id, reason: "SEM_RESPOSTA" });
      continue;
    }

    answeredItems++;
    counts[answer.response]++;

    if (item.evidenceRequiredOn.includes(answer.response) && !answer.hasEvidence) {
      issues.push({ itemId: item.id, reason: "EVIDENCIA_OBRIGATORIA" });
    }
    if (item.observationRequiredOn.includes(answer.response) && !answer.observation?.trim()) {
      issues.push({ itemId: item.id, reason: "OBSERVACAO_OBRIGATORIA" });
    }
  }

  const applicable = answeredItems - counts.NAO_APLICAVEL;
  const conformityPercentage = applicable > 0 ? (counts.CONFORME / applicable) * 100 : null;

  return {
    canConclude: issues.length === 0,
    issues,
    conformityPercentage,
    counts,
    totalItems: items.length,
    answeredItems,
  };
}
