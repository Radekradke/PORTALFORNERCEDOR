import type { RequirementObligation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const OBLIGATION_RANK: Record<RequirementObligation, number> = {
  OBRIGATORIO: 3,
  CONDICIONAL: 2,
  INFORMATIVO: 1,
};

function strongestObligation(a: RequirementObligation, b: RequirementObligation): RequirementObligation {
  return OBLIGATION_RANK[a] >= OBLIGATION_RANK[b] ? a : b;
}

/**
 * RF-036: gera/atualiza os SupplierRequirement de um fornecedor a partir da
 * matriz vigente (categorias + criticidade). RN-004: a matriz é a união dos
 * requisitos das categorias do fornecedor filtrados pela sua criticidade,
 * sem duplicar por tipo de documento (quando mais de uma regra ativa aponta
 * para o mesmo tipo, prevalece a obrigatoriedade mais forte).
 *
 * Nunca reescreve decisões já tomadas (RF-038): apenas ajusta obligation/
 * active dos "slots" — as versões de documento já enviadas/decididas
 * permanecem intactas.
 *
 * Chamado automaticamente ao validar o cadastro e ao alterar governança
 * (supplier-service.ts), e manualmente pela tela do fornecedor 360°.
 */
export async function applyRequirementMatrix(actor: Actor, supplierId: string, context: RequestContext) {
  assertAuthorized(actor, "requirement.manage");

  const supplier = await prisma.supplier.findUniqueOrThrow({
    where: { id: supplierId },
    include: { categories: true },
  });

  const categoryIds = supplier.categories.map((c) => c.categoryId);

  const matchingRules =
    categoryIds.length === 0 || !supplier.criticality
      ? []
      : await prisma.requirementRule.findMany({
          where: {
            active: true,
            categoryId: { in: categoryIds },
            criticalities: { has: supplier.criticality },
          },
        });

  const byType = new Map<string, { obligation: RequirementObligation; ruleId: string }>();
  for (const rule of matchingRules) {
    const existing = byType.get(rule.requirementTypeId);
    if (!existing) {
      byType.set(rule.requirementTypeId, { obligation: rule.obligation, ruleId: rule.id });
    } else {
      const obligation = strongestObligation(existing.obligation, rule.obligation);
      byType.set(rule.requirementTypeId, {
        obligation,
        ruleId: obligation === existing.obligation ? existing.ruleId : rule.id,
      });
    }
  }

  const existingRequirements = await prisma.supplierRequirement.findMany({ where: { supplierId } });
  const existingByType = new Map(existingRequirements.map((r) => [r.requirementTypeId, r]));

  let created = 0;
  let updated = 0;
  let deactivated = 0;

  await prisma.$transaction(async (tx) => {
    for (const [requirementTypeId, { obligation, ruleId }] of byType) {
      const existing = existingByType.get(requirementTypeId);
      if (!existing) {
        await tx.supplierRequirement.create({
          data: { supplierId, requirementTypeId, obligation, sourceRuleId: ruleId, active: true },
        });
        created++;
      } else if (existing.obligation !== obligation || existing.sourceRuleId !== ruleId || !existing.active) {
        await tx.supplierRequirement.update({
          where: { id: existing.id },
          data: { obligation, sourceRuleId: ruleId, active: true },
        });
        updated++;
      }
    }

    for (const existing of existingRequirements) {
      if (existing.active && !byType.has(existing.requirementTypeId)) {
        await tx.supplierRequirement.update({ where: { id: existing.id }, data: { active: false } });
        deactivated++;
      }
    }

    if (created > 0 || updated > 0 || deactivated > 0) {
      await recordAudit(
        {
          actorId: actor.id,
          action: "supplier.requirements.reapply",
          entityType: "Supplier",
          entityId: supplierId,
          supplierId,
          after: { created, updated, deactivated },
          context: { source: "web", ...context },
          visibility: "interna",
        },
        tx,
      );
    }
  });

  return { created, updated, deactivated };
}
