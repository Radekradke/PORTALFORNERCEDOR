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
    supplierId: null,
    sensitivePermissions: [],
    ...overrides,
  };
}

describe("authorize() — matriz de acesso F1 (usuários, permissões, auditoria)", () => {
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
      supplierId: "supplier-1",
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
      authorize(makeActor({ role: "FORNECEDOR_COLABORADOR", supplierId: "supplier-1" }), "audit.view"),
    ).toBe(false);
  });

  it("nega qualquer ação para ator com status diferente de ACTIVE", () => {
    const adminBloqueado = makeActor({ role: "ADMIN_TI", status: "BLOCKED" });
    expect(authorize(adminBloqueado, "user.create")).toBe(false);

    const adminConvidado = makeActor({ role: "ADMIN_TI", status: "INVITED" });
    expect(authorize(adminConvidado, "user.view")).toBe(false);
  });
});

describe("authorize() — matriz de acesso F2 (fornecedores)", () => {
  it("permite somente Compras criar/convidar fornecedor", () => {
    expect(authorize(makeActor({ role: "COMPRAS" }), "supplier.create")).toBe(true);
    expect(authorize(makeActor({ role: "ADMIN_TI" }), "supplier.create")).toBe(false);
    expect(authorize(makeActor({ role: "QSMS" }), "supplier.create")).toBe(false);
  });

  it("permite Admin TI, Compras e QSMS visualizarem qualquer fornecedor", () => {
    expect(authorize(makeActor({ role: "ADMIN_TI" }), "supplier.view", { supplierId: "s1" })).toBe(true);
    expect(authorize(makeActor({ role: "COMPRAS" }), "supplier.view", { supplierId: "s1" })).toBe(true);
    expect(authorize(makeActor({ role: "QSMS" }), "supplier.view", { supplierId: "s1" })).toBe(true);
  });

  it("isola fornecedor: só enxerga e edita o próprio CNPJ (CA-03)", () => {
    const fornecedorA = makeActor({ role: "FORNECEDOR_ADMIN", supplierId: "supplier-A" });

    expect(authorize(fornecedorA, "supplier.view", { supplierId: "supplier-A" })).toBe(true);
    expect(authorize(fornecedorA, "supplier.view", { supplierId: "supplier-B" })).toBe(false);
    expect(authorize(fornecedorA, "supplier.edit.own", { supplierId: "supplier-A" })).toBe(true);
    expect(authorize(fornecedorA, "supplier.edit.own", { supplierId: "supplier-B" })).toBe(false);

    // sem resource (uso indevido) nunca autoriza um recurso externo específico
    expect(authorize(fornecedorA, "supplier.view")).toBe(false);
  });

  it("colaborador do fornecedor vê o próprio fornecedor mas não edita cadastro", () => {
    const colaborador = makeActor({ role: "FORNECEDOR_COLABORADOR", supplierId: "supplier-A" });
    expect(authorize(colaborador, "supplier.view", { supplierId: "supplier-A" })).toBe(true);
    expect(authorize(colaborador, "supplier.edit.own", { supplierId: "supplier-A" })).toBe(false);
  });

  it("revisão de cadastro (validar/ajustes/rejeitar/inativar) é exclusiva de Compras", () => {
    const compras = makeActor({ role: "COMPRAS" });
    const qsms = makeActor({ role: "QSMS" });
    for (const action of [
      "supplier.registration.start_review",
      "supplier.registration.validate",
      "supplier.registration.request_adjustments",
      "supplier.registration.reject",
      "supplier.inactivate",
      "supplier.reactivate",
    ] as const) {
      expect(authorize(compras, action)).toBe(true);
      expect(authorize(qsms, action)).toBe(false);
    }
  });

  it("suspender/bloquear/desbloquear exigem a permissão sensível correspondente concedida", () => {
    const comprasSemPermissao = makeActor({ role: "COMPRAS" });
    const comprasComPermissao = makeActor({ role: "COMPRAS", sensitivePermissions: ["SUPPLIER_SUSPEND"] });
    const qsmsComOutraPermissao = makeActor({ role: "QSMS", sensitivePermissions: ["SUPPLIER_BLOCK"] });

    expect(authorize(comprasSemPermissao, "supplier.suspend")).toBe(false);
    expect(authorize(comprasComPermissao, "supplier.suspend")).toBe(true);
    expect(authorize(comprasComPermissao, "supplier.block")).toBe(false);
    expect(authorize(qsmsComOutraPermissao, "supplier.block")).toBe(true);
    expect(authorize(qsmsComOutraPermissao, "supplier.suspend")).toBe(false);

    // Admin TI nunca tem permissão sensível de negócio, mesmo se o array viesse preenchido por engano.
    const adminComPermissaoIndevida = makeActor({
      role: "ADMIN_TI",
      sensitivePermissions: ["SUPPLIER_SUSPEND"],
    });
    expect(authorize(adminComPermissaoIndevida, "supplier.suspend")).toBe(false);
  });

  it("catálogo de categorias é gerenciado por Compras e QSMS; visível a todos os internos e ao próprio fornecedor", () => {
    expect(authorize(makeActor({ role: "COMPRAS" }), "category.manage")).toBe(true);
    expect(authorize(makeActor({ role: "QSMS" }), "category.manage")).toBe(true);
    expect(authorize(makeActor({ role: "ADMIN_TI" }), "category.manage")).toBe(false);

    expect(authorize(makeActor({ role: "ADMIN_TI" }), "category.view")).toBe(true);
    expect(
      authorize(makeActor({ role: "FORNECEDOR_ADMIN", supplierId: "s1" }), "category.view", { supplierId: "s1" }),
    ).toBe(true);
  });
});
