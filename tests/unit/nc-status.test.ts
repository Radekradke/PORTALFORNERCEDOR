import { describe, it, expect } from "vitest";
import { suggestedDeadlineDays, suggestedDeadline, isOverdue } from "@/modules/nonconformities/services/nc-status";

describe("suggestedDeadlineDays", () => {
  it("segue a tabela de prazos sugeridos por gravidade (RN-017)", () => {
    expect(suggestedDeadlineDays("BAIXA")).toBe(30);
    expect(suggestedDeadlineDays("MEDIA")).toBe(15);
    expect(suggestedDeadlineDays("ALTA")).toBe(7);
    expect(suggestedDeadlineDays("CRITICA")).toBe(1);
  });
});

describe("suggestedDeadline", () => {
  it("soma os dias sugeridos à data de referência", () => {
    const from = new Date("2026-09-08T00:00:00.000Z");
    const deadline = suggestedDeadline("ALTA", from);
    expect(deadline.toISOString().slice(0, 10)).toBe("2026-09-15");
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");

  it("nunca está vencida quando encerrada, mesmo com prazo passado", () => {
    expect(isOverdue("ENCERRADA", "2026-01-01T00:00:00.000Z", now)).toBe(false);
  });

  it("está vencida quando o prazo já passou e não está encerrada", () => {
    expect(isOverdue("EM_CORRECAO", "2026-09-01T00:00:00.000Z", now)).toBe(true);
  });

  it("não está vencida quando o prazo ainda não chegou", () => {
    expect(isOverdue("AGUARDANDO_PLANO", "2026-12-01T00:00:00.000Z", now)).toBe(false);
  });
});
