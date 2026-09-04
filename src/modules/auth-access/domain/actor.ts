import type { SensitivePermission, UserRole, UserStatus } from "@prisma/client";

/**
 * Representação mínima e segura do usuário autenticado, usada em toda a
 * camada de autorização. Nunca contém passwordHash nem tokens.
 */
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  supplierId: string | null;
  sensitivePermissions: SensitivePermission[];
}

export function hasSensitivePermission(
  actor: Actor,
  permission: SensitivePermission,
): boolean {
  return actor.sensitivePermissions.includes(permission);
}

export function isInternal(actor: Actor): boolean {
  return actor.role === "ADMIN_TI" || actor.role === "COMPRAS" || actor.role === "QSMS";
}

export function isExternal(actor: Actor): boolean {
  return actor.role === "FORNECEDOR_ADMIN" || actor.role === "FORNECEDOR_COLABORADOR";
}
