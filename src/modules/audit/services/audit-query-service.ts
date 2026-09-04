import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
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
