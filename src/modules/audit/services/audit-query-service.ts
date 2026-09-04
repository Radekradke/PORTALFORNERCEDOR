import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}

/** RF-120: consulta de auditoria filtrável, somente leitura (nunca permite alteração). */
export async function listAuditLogs(actor: Actor, filters: AuditLogFilters = {}) {
  assertAuthorized(actor, "audit.view");

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where = {
    ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" as const } } : {}),
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.entityId ? { entityId: filters.entityId } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Linha do tempo visível ao próprio fornecedor (RF-136, EXT-08). Nunca passa
 * por `audit.view` (ação interna): usa isolamento por `supplierId` e só
 * devolve eventos marcados como `externa` (RN-021 — nada interno vaza).
 */
export async function listSupplierExternalHistory(actor: Actor, supplierId: string) {
  if (!actor.supplierId || actor.supplierId !== supplierId) {
    throw new Error("Fornecedor não autorizado a ver este histórico.");
  }

  return prisma.auditLog.findMany({
    where: { supplierId, entityType: "Supplier", visibility: "externa" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
