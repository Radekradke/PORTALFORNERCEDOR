import type { Actor } from "./actor";

/**
 * Ponto único de autorização por ação e recurso (aplicar-rbac-auditoria).
 * Nunca decida acesso comparando `role === "..."` espalhado pelo código:
 * toda checagem de permissão passa por `authorize()`.
 *
 * Ações desta e das fatias anteriores. Fatias futuras (documentos,
 * qualificação, fiscalização, NC) adicionam suas próprias ações aqui, sem
 * criar um novo mecanismo de autorização paralelo.
 */
export type Action =
  // F1 — usuários, permissões e auditoria
  | "user.create"
  | "user.view"
  | "user.block"
  | "user.unblock"
  | "permission.grant"
  | "permission.revoke"
  | "audit.view"
  // F2 — fornecedores
  | "supplier.create"
  | "supplier.view"
  | "supplier.edit.governance" // categoria, criticidade, responsáveis (Compras)
  | "supplier.edit.own" // dados cadastrais editados pelo próprio fornecedor
  | "supplier.submit_for_analysis"
  | "supplier.registration.start_review"
  | "supplier.registration.validate"
  | "supplier.registration.request_adjustments"
  | "supplier.registration.reject"
  | "supplier.inactivate"
  | "supplier.reactivate"
  | "supplier.suspend"
  | "supplier.block"
  | "supplier.unblock"
  | "category.view"
  | "category.manage"
  // F3 — requisitos e documentos
  | "requirement.view"
  | "requirement.manage"
  | "document.view"
  | "document.upload"
  | "document.review";

export interface ResourceContext {
  /** Fornecedor dono do recurso avaliado — obrigatório para ações "*.own" e para conferir isolamento externo. */
  supplierId?: string | null;
}

export function authorize(actor: Actor, action: Action, resource?: ResourceContext): boolean {
  if (actor.status !== "ACTIVE") return false;

  switch (action) {
    // Gestão de usuários e permissões internas é exclusiva do Admin TI
    // (RF-004, RF-005; tabela "Resumo de permissões" - Usuários e perfis: G=Admin TI).
    // Admin TI administra contas e permissões, mas não decide negócio (não
    // concede a si mesmo permissões sensíveis de Compras/QSMS por padrão).
    case "user.create":
    case "user.block":
    case "user.unblock":
    case "permission.grant":
    case "permission.revoke":
      return actor.role === "ADMIN_TI";

    case "user.view":
      return actor.role === "ADMIN_TI";

    // Consulta de auditoria pertence a Admin TI (completa), Compras e QSMS
    // (própria área). Fornecedor nunca acessa auditoria interna (RN-021).
    case "audit.view":
      return actor.role === "ADMIN_TI" || actor.role === "COMPRAS" || actor.role === "QSMS";

    // Convite/cadastro de fornecedor é uma responsabilidade base de Compras
    // (RF-016; tabela "Resumo de permissões" - Fornecedores: G=Compras). Não é
    // permissão sensível individual — qualquer usuário COMPRAS ativo pode.
    case "supplier.create":
    case "supplier.edit.governance":
      return actor.role === "COMPRAS";

    // Visualizar fornecedor: Admin TI, Compras e QSMS veem qualquer um
    // (V/V/Parecer). Fornecedor só vê o próprio (RN-021, CA-03).
    case "supplier.view":
    case "category.view":
      if (actor.role === "ADMIN_TI" || actor.role === "COMPRAS" || actor.role === "QSMS") {
        return true;
      }
      if (actor.role === "FORNECEDOR_ADMIN" || actor.role === "FORNECEDOR_COLABORADOR") {
        return isOwnSupplier(actor, resource);
      }
      return false;

    // Edição do cadastro pelo próprio fornecedor: só o administrador do
    // fornecedor (não colaborador — tabela "Perfis externos"), e só do
    // próprio CNPJ.
    case "supplier.edit.own":
    case "supplier.submit_for_analysis":
      return actor.role === "FORNECEDOR_ADMIN" && isOwnSupplier(actor, resource);

    // Revisão do cadastro (RF-019) é atribuição base de Compras.
    case "supplier.registration.start_review":
    case "supplier.registration.validate":
    case "supplier.registration.request_adjustments":
    case "supplier.registration.reject":
    case "supplier.inactivate":
    case "supplier.reactivate":
      return actor.role === "COMPRAS";

    // Suspender/bloquear/desbloquear são permissões sensíveis concedidas
    // individualmente a Compras ou QSMS (docs/REGRAS_FUNCIONAIS.md).
    case "supplier.suspend":
      return hasPermission(actor, "SUPPLIER_SUSPEND");
    case "supplier.block":
      return hasPermission(actor, "SUPPLIER_BLOCK");
    case "supplier.unblock":
      return hasPermission(actor, "SUPPLIER_UNBLOCK");

    // Catálogo de categorias e matriz de requisitos: Compras e QSMS
    // gerenciam (RF-030, RF-032; tabela "Resumo de permissões" -
    // Categorias/requisitos: G/G). Consulta é livre a todos os internos.
    case "category.manage":
    case "requirement.manage":
      return actor.role === "COMPRAS" || actor.role === "QSMS";

    case "requirement.view":
      return actor.role === "ADMIN_TI" || actor.role === "COMPRAS" || actor.role === "QSMS";

    // Documentos: QSMS gerencia (analisa/aprova/rejeita), Admin TI e Compras
    // só visualizam (tabela "Resumo de permissões" - Documentos: V/V/G).
    // Fornecedor só vê e envia os do próprio CNPJ (RN-021, CA-03).
    case "document.view":
      if (actor.role === "ADMIN_TI" || actor.role === "COMPRAS" || actor.role === "QSMS") {
        return true;
      }
      if (actor.role === "FORNECEDOR_ADMIN" || actor.role === "FORNECEDOR_COLABORADOR") {
        return isOwnSupplier(actor, resource);
      }
      return false;

    // Envio de documento: ambos os perfis externos podem (tabela "Perfis
    // externos" - Colaborador do fornecedor: "Enviar documento/evidência").
    case "document.upload":
      return (
        (actor.role === "FORNECEDOR_ADMIN" || actor.role === "FORNECEDOR_COLABORADOR") &&
        isOwnSupplier(actor, resource)
      );

    case "document.review":
      return actor.role === "QSMS";

    default:
      return false;
  }
}

function isOwnSupplier(actor: Actor, resource?: ResourceContext): boolean {
  if (!actor.supplierId) return false;
  if (!resource || resource.supplierId === undefined) return false;
  return resource.supplierId === actor.supplierId;
}

function hasPermission(actor: Actor, permission: Actor["sensitivePermissions"][number]): boolean {
  return (
    (actor.role === "COMPRAS" || actor.role === "QSMS") &&
    actor.sensitivePermissions.includes(permission)
  );
}

/** Lança se a ação não for permitida. Uso nas actions/rotas de mutação. */
export class AuthorizationError extends Error {
  constructor(message = "Você não tem permissão para executar esta ação.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertAuthorized(actor: Actor, action: Action, resource?: ResourceContext): void {
  if (!authorize(actor, action, resource)) {
    throw new AuthorizationError();
  }
}
