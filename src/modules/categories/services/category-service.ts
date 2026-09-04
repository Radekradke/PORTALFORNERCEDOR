import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";

export class CategoryServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

/**
 * Catálogo de categorias (RF-030). A matriz de requisitos por
 * categoria/criticidade (RequirementRule) entra na fatia F3 — aqui só existe
 * o catálogo em si e o vínculo com o fornecedor.
 */
export async function createCategory(actor: Actor, input: CreateCategoryInput, context: RequestContext) {
  assertAuthorized(actor, "category.manage");

  const code = input.code.trim().toUpperCase();
  if (!code) throw new CategoryServiceError("Informe um código para a categoria.");

  const existing = await prisma.category.findUnique({ where: { code } });
  if (existing) throw new CategoryServiceError("Já existe uma categoria com este código.");

  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        code,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        parentId: input.parentId || null,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "category.create",
        entityType: "Category",
        entityId: created.id,
        after: { code: created.code, name: created.name },
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
        visibility: "interna",
      },
      tx,
    );
    return created;
  });

  return category;
}

export async function setCategoryActive(
  actor: Actor,
  categoryId: string,
  active: boolean,
  context: RequestContext,
) {
  assertAuthorized(actor, "category.manage");

  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id: categoryId }, data: { active } });
    await recordAudit(
      {
        actorId: actor.id,
        action: active ? "category.activate" : "category.deactivate",
        entityType: "Category",
        entityId: categoryId,
        context: { source: "web", ip: context.ip, userAgent: context.userAgent },
        visibility: "interna",
      },
      tx,
    );
  });
}

export async function listCategories(actor: Actor, includeInactive = false) {
  assertAuthorized(actor, "category.view");

  return prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ code: "asc" }],
  });
}
