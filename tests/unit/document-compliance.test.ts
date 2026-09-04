import { describe, expect, it } from "vitest";
import { computeDocumentCompliance } from "@/modules/documents/services/document-compliance";
import type { DocumentVersion } from "@prisma/client";

function makeVersion(overrides: Partial<DocumentVersion>): DocumentVersion {
  return {
    id: "v1",
    supplierRequirementId: "req-1",
    versionNumber: 1,
    fileObjectId: "file-1",
    documentNumber: null,
    issuer: null,
    issuedAt: null,
    validUntil: null,
    submitterNote: null,
    status: "ENVIADO",
    submittedById: "user-1",
    reviewedById: null,
    reviewedAt: null,
    reviewReason: null,
    internalNote: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  } as DocumentVersion;
}

const NOW = new Date("2026-06-15T12:00:00Z");
const ALERT_WINDOWS = [60, 30, 15, 7];

describe("computeDocumentCompliance()", () => {
  it("NAO_APLICAVEL quando o requisito condicional foi marcado como não aplicável", () => {
    const result = computeDocumentCompliance(
      { applicable: false, obligation: "CONDICIONAL" },
      [],
      ALERT_WINDOWS,
      NOW,
    );
    expect(result.status).toBe("NAO_APLICAVEL");
  });

  it("PENDENTE quando não há nenhuma versão enviada", () => {
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("PENDENTE");
  });

  it("AGUARDANDO_ANALISE quando a única versão está enviada ou em análise", () => {
    const v = makeVersion({ status: "ENVIADO" });
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("AGUARDANDO_ANALISE");
    expect(result.hasPendingReview).toBe(true);
  });

  it("REJEITADO quando a última versão foi rejeitada e nunca houve aprovação", () => {
    const v = makeVersion({ status: "REJEITADO", reviewReason: "Documento ilegível" });
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("REJEITADO");
  });

  it("ATENDIDO quando aprovado sem data de validade", () => {
    const v = makeVersion({ status: "APROVADO", validUntil: null });
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("ATENDIDO");
    expect(result.currentVersion?.id).toBe("v1");
  });

  it("ATENDIDO quando aprovado e a validade está fora da janela de alerta", () => {
    const v = makeVersion({ status: "APROVADO", validUntil: new Date("2026-12-31") });
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("ATENDIDO");
  });

  it("VENCENDO quando dentro da maior janela de alerta configurada", () => {
    const v = makeVersion({ status: "APROVADO", validUntil: new Date("2026-07-01") }); // ~16 dias de NOW
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("VENCENDO");
  });

  it("VENCIDO quando a data de validade já passou", () => {
    const v = makeVersion({ status: "APROVADO", validUntil: new Date("2026-01-01") });
    const result = computeDocumentCompliance({ applicable: true, obligation: "OBRIGATORIO" }, [v], ALERT_WINDOWS, NOW);
    expect(result.status).toBe("VENCIDO");
  });

  it("RN-006: versão vigente permanece ATENDIDO mesmo com uma nova versão em análise", () => {
    const approved = makeVersion({
      id: "v1",
      versionNumber: 1,
      status: "APROVADO",
      validUntil: new Date("2026-12-31"),
    });
    const pending = makeVersion({ id: "v2", versionNumber: 2, status: "ENVIADO" });
    const result = computeDocumentCompliance(
      { applicable: true, obligation: "OBRIGATORIO" },
      [approved, pending],
      ALERT_WINDOWS,
      NOW,
    );
    expect(result.status).toBe("ATENDIDO");
    expect(result.currentVersion?.id).toBe("v1");
    expect(result.latestVersion?.id).toBe("v2");
    expect(result.hasPendingReview).toBe(true);
  });
});
