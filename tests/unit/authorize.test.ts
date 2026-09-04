import { describe, expect, it } from "vitest";
import { authorize } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";

function makeActor(overrides: Partial<Actor>): Actor {
  return {
    id: "actor-1",
    name: "Ator de Teste",
    email: "ator@lifting.local",
    role: "ADMIN_TI",
    status: "ACTIVE",
    organizationId: null,
    sensitivePermissions: [],
    ...overrides,
  };
}

describe("authorize() — matriz de acesso F1", () => {
  it("permite Admin TI gerenciar usuários", () => {
    const adminTi = makeActor({ role: "ADMIN_TI" });
    expect(authorize(adminTi, "user.create")).toBe(true);
    expect(authorize(adminTi, "user.block")).toBe(true);
    expect(authorize(adminTi, "user.unblock")).toBe(true);
    expect(authorize(adminTi, "user.view")).toBe(true);
    expect(authorize(adminTi, "permission.grant")).toBe(true);
    expect(authorize(adminTi, "permission.revoke")).toBe(true);
  });

  it("nega Compras gerenciar usuários (não é perfil de administração técnica)", () => {
    const compras = makeActor({ role: "COMPRAS" });
    expect(authorize(compras, "user.create")).toBe(false);
    expect(authorize(compras, "user.block")).toBe(false);
    expect(authorize(compras, "user.unblock")).toBe(false);
    expect(authorize(compras, "permission.grant")).toBe(false);
    expect(authorize(compras, "permission.revoke")).toBe(false);
    expect(authorize(compras, "user.view")).toBe(false);
  });

  it("nega QSMS gerenciar usuários e permissões", () => {
    const qsms = makeActor({ role: "QSMS" });
    expect(authorize(qsms, "user.create")).toBe(false);
    expect(authorize(qsms, "permission.grant")).toBe(false);
  });

  it("nega perfis externos em qualquer ação interna desta fatia", () => {
    const fornecedorAdmin = makeActor({
      role: "FORNECEDOR_ADMIN",
      organizationId: "org-1",
    });
    expect(authorize(fornecedorAdmin, "user.create")).toBe(false);
    expect(authorize(fornecedorAdmin, "audit.view")).toBe(false);
    expect(authorize(fornecedorAdmin, "user.view")).toBe(false);
  });

  it("permite Admin TI, Compras e QSMS consultarem auditoria (Fornecedor não)", () => {
    expect(authorize(makeActor({ role: "ADMIN_TI" }), "audit.view")).toBe(true);
    expect(authorize(makeActor({ role: "COMPRAS" }), "audit.view")).toBe(true);
    expect(authorize(makeActor({ role: "QSMS" }), "audit.view")).toBe(true);
    expect(
      authorize(makeActor({ role: "FORNECEDOR_COLABORADOR", organizationId: "org-1" }), "audit.view"),
    ).toBe(false);
  });

  it("nega qualquer ação para ator com status diferente de ACTIVE", () => {
    const adminBloqueado = makeActor({ role: "ADMIN_TI", status: "BLOCKED" });
    expect(authorize(adminBloqueado, "user.create")).toBe(false);

    const adminConvidado = makeActor({ role: "ADMIN_TI", status: "INVITED" });
    expect(authorize(adminConvidado, "user.view")).toBe(false);
  });
});
