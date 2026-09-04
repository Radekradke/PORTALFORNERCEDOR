import type { Actor } from "./actor";

/**
 * Ponto único de autorização por ação e recurso (aplicar-rbac-auditoria).
 * Nunca decida acesso comparando `role === "..."` espalhado pelo código:
 * toda checagem de permissão passa por `authorize()`.
 *
 * Ações desta fatia (F1). Fatias futuras (fornecedores, documentos,
 * fiscalização, NC) adicionam suas próprias ações aqui, sem criar um novo
 * mecanismo de autorização paralelo.
 */
export type Action =
  | "user.create"
  | "user.view"
  | "user.block"
  | "user.unblock"
  | "permission.grant"
  | "permission.revoke"
  | "audit.view";

export interface ResourceContext {
  organizationId?: string | null;
}

export function authorize(actor: Actor, action: Action, _resource?: ResourceContext): boolean {
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

    default:
      return false;
  }
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
