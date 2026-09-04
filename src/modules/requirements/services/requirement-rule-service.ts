import type { Criticality, RequirementObligation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";

export class RequirementRuleServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface CreateRequirementRuleInput {
  requirementTypeId: string;
  categoryId: string;
  criticalities: Criticality[];
  obligation: RequirementObligation;
}

/**
 * Matriz de requisitos por categoria/criticidade (RF-032). Criar/editar uma
 * regra nunca altera SupplierRequirement já gerados (RF-038) — é preciso
 * reaplicar a matriz explicitamente (ver apply-matrix-service.ts).
 */
export async function createRequirementRule(
  actor: Actor,
  input: CreateRequirementRuleInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "requirement.manage");

  if (input.criticalities.length === 0) {
    throw new RequirementRuleServiceError("Selecione ao menos uma criticidade.");
  }

  const rule = await prisma.$transaction(async (tx) => {
    const created = await tx.requirementRule.create({
      data: {
        requirementTypeId: input.requirementTypeId,
        categoryId: input.categoryId,
        criticalities: input.criticalities,
        obligation: input.obligation,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "requirement_rule.create",
        entityType: "RequirementRule",
        entityId: created.id,
        after: {
          requirementTypeId: input.requirementTypeId,
          categoryId: input.categoryId,
          criticalities: input.criticalities,
          obligation: input.obligation,
        },
        context: { source: "web", ...context },
        visibility: "interna",
      },
      tx,
    );
    return created;
  });

  return rule;
}

export async function setRequirementRuleActive(
  actor: Actor,
  id: string,
  active: boolean,
  context: RequestContext,
) {
  assertAuthorized(actor, "requirement.manage");

  await prisma.$transaction(async (tx) => {
    await tx.requirementRule.update({ where: { id }, data: { active } });
    await recordAudit(
      {
        actorId: actor.id,
        action: active ? "requirement_rule.activate" : "requirement_rule.deactivate",
        entityType: "RequirementRule",
        entityId: id,
        context: { source: "web", ...context },
        visibility: "interna",
      },
      tx,
    );
  });
}

export async function listRequirementRules(actor: Actor, includeInactive = false) {
  assertAuthorized(actor, "requirement.view");

  return prisma.requirementRule.findMany({
    where: includeInactive ? {} : { active: true },
    include: { requirementType: true, category: true },
    orderBy: [{ categoryId: "asc" }],
  });
}
