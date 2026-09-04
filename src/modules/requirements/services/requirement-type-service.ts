import type { ValidityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";

export class RequirementTypeServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

export interface CreateRequirementTypeInput {
  code: string;
  name: string;
  description?: string;
  allowedFormats?: string[]; // subconjunto de PDF/JPG/PNG
  validityType: ValidityType;
  validityDays?: number;
  needsIssueDate?: boolean;
  alertWindowDays?: number[];
}

/** Tipos de documento/evidência (RF-031) — catálogo gerenciado por Compras/QSMS. */
export async function createRequirementType(
  actor: Actor,
  input: CreateRequirementTypeInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "requirement.manage");

  const code = input.code.trim().toUpperCase();
  if (!code) throw new RequirementTypeServiceError("Informe um código.");
  if (input.validityType === "FIXA" && !input.validityDays) {
    throw new RequirementTypeServiceError("Informe a quantidade de dias de validade (validade fixa).");
  }

  const existing = await prisma.requirementType.findUnique({ where: { code } });
  if (existing) throw new RequirementTypeServiceError("Já existe um tipo de documento com este código.");

  const created = await prisma.$transaction(async (tx) => {
    const type = await tx.requirementType.create({
      data: {
        code,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        allowedFormats: input.allowedFormats ?? [],
        validityType: input.validityType,
        validityDays: input.validityType === "FIXA" ? input.validityDays : null,
        needsIssueDate: input.needsIssueDate ?? false,
        alertWindowDays: input.alertWindowDays?.length ? input.alertWindowDays : [60, 30, 15, 7],
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "requirement_type.create",
        entityType: "RequirementType",
        entityId: type.id,
        after: { code: type.code, name: type.name },
        context: { source: "web", ...context },
        visibility: "interna",
      },
      tx,
    );
    return type;
  });

  return created;
}

export async function setRequirementTypeActive(
  actor: Actor,
  id: string,
  active: boolean,
  context: RequestContext,
) {
  assertAuthorized(actor, "requirement.manage");

  await prisma.$transaction(async (tx) => {
    await tx.requirementType.update({ where: { id }, data: { active } });
    await recordAudit(
      {
        actorId: actor.id,
        action: active ? "requirement_type.activate" : "requirement_type.deactivate",
        entityType: "RequirementType",
        entityId: id,
        context: { source: "web", ...context },
        visibility: "interna",
      },
      tx,
    );
  });
}

export async function listRequirementTypes(actor: Actor, includeInactive = false) {
  assertAuthorized(actor, "requirement.view");

  return prisma.requirementType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { code: "asc" },
  });
}
