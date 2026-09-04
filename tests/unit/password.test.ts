import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "@/lib/password";

describe("password.ts", () => {
  it("gera hash Argon2id e verifica a senha correta", async () => {
    const hash = await hashPassword("SenhaForte#2026");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, "SenhaForte#2026")).resolves.toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await hashPassword("SenhaForte#2026");
    await expect(verifyPassword(hash, "outra-senha")).resolves.toBe(false);
  });

  it("nunca derruba a aplicação com hash malformado", async () => {
    await expect(verifyPassword("hash-invalido", "qualquer")).resolves.toBe(false);
  });

  it("valida a política mínima de senha", () => {
    expect(isPasswordStrongEnough("curta1")).toBe(false); // menor que 10
    expect(isPasswordStrongEnough("somenteletras")).toBe(false); // sem número/símbolo
    expect(isPasswordStrongEnough("SenhaForte#2026")).toBe(true);
  });
});
