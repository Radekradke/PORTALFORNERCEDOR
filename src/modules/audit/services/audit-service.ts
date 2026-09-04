import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AuditContext {
  source: "web" | "system";
  ip?: string | null;
  userAgent?: string | null;
}

export interface RecordAuditInput {
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  reason?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  context: AuditContext;
  visibility?: "interna" | "externa" | "restrita";
}

/**
 * Grava um evento de auditoria. Deve sempre ser chamado dentro da mesma
 * transação da mutação que ele descreve (aplicar-rbac-auditoria).
 * Nunca inclua senha, hash de senha, token ou conteúdo de arquivo.
 */
export async function recordAudit(
  input: RecordAuditInput,
  client: Pick<PrismaClient, "auditLog"> = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      organizationId: input.organizationId ?? null,
      reason: input.reason ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      context: { ...input.context } as Prisma.InputJsonValue,
      visibility: input.visibility ?? "interna",
    },
  });
}
