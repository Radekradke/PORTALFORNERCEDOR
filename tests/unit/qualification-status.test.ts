import { describe, it, expect } from "vitest";
import { computeQualificationStatus, canApproveNormally } from "@/modules/qualifications/services/qualification-status";

describe("computeQualificationStatus", () => {
  it("retorna NAO_INICIADA quando não há rodada", () => {
    expect(computeQualificationStatus(null, false)).toBe("NAO_INICIADA");
  });

  it("retorna DOCUMENTACAO_PENDENTE na 1ª rodada aberta com pendência obrigatória", () => {
    expect(computeQualificationStatus({ round: 1, result: null }, true)).toBe("DOCUMENTACAO_PENDENTE");
  });

  it("retorna EM_VALIDACAO na 1ª rodada aberta sem pendência obrigatória", () => {
    expect(computeQualificationStatus({ round: 1, result: null }, false)).toBe("EM_VALIDACAO");
  });

  it("retorna o resultado decidido, mesmo que haja pendência (decisão é imutável)", () => {
    expect(computeQualificationStatus({ round: 1, result: "APROVADO" }, true)).toBe("APROVADO");
    expect(computeQualificationStatus({ round: 1, result: "APROVADO_COM_RESSALVAS" }, false)).toBe(
      "APROVADO_COM_RESSALVAS",
    );
    expect(computeQualificationStatus({ round: 1, result: "REPROVADO" }, true)).toBe("REPROVADO");
  });

  it("retorna EM_REQUALIFICACAO para rodada > 1 ainda aberta, independente de pendência", () => {
    expect(computeQualificationStatus({ round: 2, result: null }, true)).toBe("EM_REQUALIFICACAO");
    expect(computeQualificationStatus({ round: 2, result: null }, false)).toBe("EM_REQUALIFICACAO");
  });

  it("rodada > 1 já decidida retorna o resultado, não EM_REQUALIFICACAO", () => {
    expect(computeQualificationStatus({ round: 2, result: "REPROVADO" }, false)).toBe("REPROVADO");
  });
});

describe("canApproveNormally", () => {
  it("permite aprovação normal só sem nenhuma pendência obrigatória (RN-010)", () => {
    expect(canApproveNormally(0)).toBe(true);
    expect(canApproveNormally(1)).toBe(false);
    expect(canApproveNormally(3)).toBe(false);
  });
});
