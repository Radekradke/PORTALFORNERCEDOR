import { describe, it, expect } from "vitest";
import { evaluateInspection, type ChecklistSectionSnapshot, type AnswerLike } from "@/modules/inspections/services/inspection-result";

const SECTIONS: ChecklistSectionSnapshot[] = [
  {
    id: "sec-1",
    title: "Segurança",
    order: 0,
    items: [
      {
        id: "item-1",
        text: "Uso de EPI",
        allowedResponses: ["CONFORME", "CONFORME_COM_RESSALVA", "NAO_CONFORME", "NAO_APLICAVEL"],
        evidenceRequiredOn: ["NAO_CONFORME"],
        observationRequiredOn: ["NAO_CONFORME", "NAO_APLICAVEL"],
      },
      {
        id: "item-2",
        text: "Sinalização de área",
        allowedResponses: ["CONFORME", "NAO_CONFORME"],
        evidenceRequiredOn: [],
        observationRequiredOn: [],
      },
    ],
  },
];

function answer(itemId: string, overrides: Partial<AnswerLike> = {}): AnswerLike {
  return { itemId, response: null, observation: null, hasEvidence: false, ...overrides };
}

describe("evaluateInspection", () => {
  it("bloqueia conclusão (RF-078) quando há item sem resposta", () => {
    const result = evaluateInspection(SECTIONS, [answer("item-1", { response: "CONFORME" })]);
    expect(result.canConclude).toBe(false);
    expect(result.issues).toContainEqual({ itemId: "item-2", reason: "SEM_RESPOSTA" });
  });

  it("bloqueia conclusão quando falta evidência obrigatória (RF-072)", () => {
    const result = evaluateInspection(SECTIONS, [
      answer("item-1", { response: "NAO_CONFORME", observation: "Faltou capacete", hasEvidence: false }),
      answer("item-2", { response: "CONFORME" }),
    ]);
    expect(result.canConclude).toBe(false);
    expect(result.issues).toContainEqual({ itemId: "item-1", reason: "EVIDENCIA_OBRIGATORIA" });
  });

  it("bloqueia conclusão quando falta observação obrigatória (RN-014)", () => {
    const result = evaluateInspection(SECTIONS, [
      answer("item-1", { response: "NAO_APLICAVEL", hasEvidence: false, observation: "  " }),
      answer("item-2", { response: "CONFORME" }),
    ]);
    expect(result.canConclude).toBe(false);
    expect(result.issues).toContainEqual({ itemId: "item-1", reason: "OBSERVACAO_OBRIGATORIA" });
  });

  it("permite concluir quando todos os itens têm resposta e evidência/observação exigidas", () => {
    const result = evaluateInspection(SECTIONS, [
      answer("item-1", { response: "NAO_CONFORME", observation: "Sem capacete", hasEvidence: true }),
      answer("item-2", { response: "CONFORME" }),
    ]);
    expect(result.canConclude).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("calcula conformidade excluindo N/A do denominador (RN-015)", () => {
    const result = evaluateInspection(SECTIONS, [
      answer("item-1", { response: "NAO_APLICAVEL", observation: "Não se aplica a este local" }),
      answer("item-2", { response: "CONFORME" }),
    ]);
    // 1 aplicável (item-2), 1 conforme -> 100%
    expect(result.conformityPercentage).toBe(100);
  });

  it("conformidade considera ressalva e não-conforme como não-conforme para o percentual (RN-015)", () => {
    const result = evaluateInspection(SECTIONS, [
      answer("item-1", { response: "CONFORME_COM_RESSALVA", observation: undefined as unknown as string }),
      answer("item-2", { response: "CONFORME" }),
    ]);
    // 2 aplicáveis, 1 conforme -> 50%
    expect(result.conformityPercentage).toBe(50);
  });

  it("retorna conformidade nula quando nenhum item aplicável foi respondido", () => {
    const result = evaluateInspection(
      [
        {
          id: "sec-1",
          title: "x",
          order: 0,
          items: [
            {
              id: "item-1",
              text: "único item",
              allowedResponses: ["NAO_APLICAVEL"],
              evidenceRequiredOn: [],
              observationRequiredOn: ["NAO_APLICAVEL"],
            },
          ],
        },
      ],
      [answer("item-1", { response: "NAO_APLICAVEL", observation: "não existe no local" })],
    );
    expect(result.conformityPercentage).toBeNull();
    expect(result.canConclude).toBe(true);
  });
});
