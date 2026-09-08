import { describe, it, expect } from "vitest";
import {
  documentationScore,
  inspectionScore,
  nonConformityScore,
  computeIco,
} from "@/modules/dashboard/services/ico-calculator";

describe("documentationScore", () => {
  it("retorna null quando não há requisito obrigatório aplicável", () => {
    expect(documentationScore(0, 0)).toBeNull();
  });

  it("calcula aprovados / aplicáveis em percentual", () => {
    expect(documentationScore(3, 4)).toBe(75);
    expect(documentationScore(4, 4)).toBe(100);
    expect(documentationScore(0, 4)).toBe(0);
  });
});

describe("inspectionScore", () => {
  it("retorna null sem fiscalização concluída no período", () => {
    expect(inspectionScore([])).toBeNull();
  });

  it("calcula a média simples dos percentuais de conformidade", () => {
    expect(inspectionScore([100, 50])).toBe(75);
    expect(inspectionScore([80])).toBe(80);
  });
});

describe("nonConformityScore", () => {
  it("retorna 100 sem NC aberta", () => {
    expect(nonConformityScore([])).toBe(100);
  });

  it("penaliza mais gravidade alta que baixa", () => {
    const low = nonConformityScore([{ severity: "BAIXA", overdue: false }]);
    const high = nonConformityScore([{ severity: "CRITICA", overdue: false }]);
    expect(low).toBeGreaterThan(high);
  });

  it("penaliza mais quando a NC está vencida", () => {
    const onTime = nonConformityScore([{ severity: "ALTA", overdue: false }]);
    const overdue = nonConformityScore([{ severity: "ALTA", overdue: true }]);
    expect(overdue).toBeLessThan(onTime);
  });

  it("nunca fica negativo mesmo com muitas NCs críticas", () => {
    const many = Array.from({ length: 10 }, () => ({ severity: "CRITICA", overdue: true }));
    expect(nonConformityScore(many)).toBe(0);
  });
});

describe("computeIco", () => {
  it("pondera 40/40/20 quando os três componentes existem", () => {
    const result = computeIco({ documentationScore: 100, inspectionScore: 100, nonConformityScore: 100 });
    expect(result.score).toBe(100);
  });

  it("ignora componentes sem dado (null) e reponderam os restantes", () => {
    // só documentação disponível -> score = documentationScore, não penalizado por falta dos outros
    const result = computeIco({ documentationScore: 80, inspectionScore: null, nonConformityScore: null });
    expect(result.score).toBe(80);
  });

  it("retorna score null quando nenhum componente tem dado", () => {
    const result = computeIco({ documentationScore: null, inspectionScore: null, nonConformityScore: null });
    expect(result.score).toBeNull();
  });
});
