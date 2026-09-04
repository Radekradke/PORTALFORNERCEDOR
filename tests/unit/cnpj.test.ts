import { describe, expect, it } from "vitest";
import { normalizeCnpj, formatCnpj, isValidCnpj } from "@/lib/cnpj";

describe("cnpj.ts", () => {
  it("normaliza removendo máscara", () => {
    expect(normalizeCnpj("11.000.001/0001-52")).toBe("11000001000152");
    expect(normalizeCnpj("11000001000152")).toBe("11000001000152");
  });

  it("formata 14 dígitos com máscara", () => {
    expect(formatCnpj("11000001000152")).toBe("11.000.001/0001-52");
  });

  it("mantém valor original ao formatar algo que não tem 14 dígitos", () => {
    expect(formatCnpj("123")).toBe("123");
  });

  it("valida dígitos verificadores corretos (CNPJs fictícios, ver seed.ts)", () => {
    expect(isValidCnpj("11000001000152")).toBe(true);
    expect(isValidCnpj("12000002000160")).toBe(true);
    expect(isValidCnpj("13000003000177")).toBe(true);
  });

  it("rejeita dígito verificador incorreto", () => {
    expect(isValidCnpj("11000001000199")).toBe(false);
  });

  it("rejeita quantidade de dígitos incorreta", () => {
    expect(isValidCnpj("1100000100015")).toBe(false);
    expect(isValidCnpj("110000010001522")).toBe(false);
  });

  it("rejeita sequência de dígitos repetidos", () => {
    expect(isValidCnpj("11111111111111")).toBe(false);
  });
});
