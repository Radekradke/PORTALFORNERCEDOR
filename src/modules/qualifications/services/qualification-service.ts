import type { Prisma, QualificationResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { computeDocumentCompliance } from "@/modules/documents/services/document-compliance";
import { computeQualificationStatus, canApproveNormally } from "./qualification-status";

export class QualificationServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

/** Requisitos ativos do fornecedor com a conformidade calculada (mesma lógica de document-service.listSupplierRequirements). */
async function loadActiveRequirementsWithCompliance(supplierId: string) {
  const requirements = await prisma.supplierRequirement.findMany({
    where: { supplierId, active: true },
    include: { requirementType: true, versions: { orderBy: { versionNumber: "desc" } } },
  });

  return requirements.map((requirement) => ({
    requirement,
    compliance: computeDocumentCompliance(requirement, requirement.versions, requirement.requirementType.alertWindowDays),
  }));
}

function pendingObligatoryOf(rows: Awaited<ReturnType<typeof loadActiveRequirementsWithCompliance>>) {
  return rows.filter(
    (r) => r.requirement.obligation === "OBRIGATORIO" && !["ATENDIDO", "VENCENDO"].includes(r.compliance.status),
  );
}

// -----------------------------------------------------------------------------
// Abertura de rodada (RF-060, RF-065)
// -----------------------------------------------------------------------------

/**
 * Garante a 1ª rodada de qualificação do fornecedor. Chamada automaticamente
 * ao validar o cadastro (supplier-service.validateRegistration), logo após a
 * matriz de requisitos ser aplicada — nunca antes disso, para não fazer
 * "Não iniciada" (seção 5.2) perder sentido. Idempotente: se já existir
 * qualquer rodada, não faz nada (uma 2ª rodada só nasce de requalificação
 * manual explícita, nunca automaticamente).
 */
export async function ensureQualificationRound(actor: Actor, supplierId: string, context: RequestContext) {
  assertAuthorized(actor, "qualification.manage");

  const existing = await prisma.qualification.findFirst({ where: { supplierId } });
  if (existing) return existing;

  const activeRequirements = await prisma.supplierRequirement.findMany({
    where: { supplierId, active: true },
    select: { id: true, requirementTypeId: true, obligation: true },
  });

  return prisma.$transaction(async (tx) => {
    const qualification = await tx.qualification.create({
      data: {
        supplierId,
        round: 1,
        startedById: actor.id,
        matrixSnapshot: activeRequirements as unknown as Prisma.InputJsonValue,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "qualification.round.start",
        entityType: "Qualification",
        entityId: qualification.id,
        supplierId,
        after: { round: 1, requirementCount: activeRequirements.length },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );

    return qualification;
  });
}

/** RF-065: nova rodada manual, só depois da rodada atual decidida. Preserva as anteriores (nunca apaga). */
export async function startRequalification(actor: Actor, supplierId: string, reason: string, context: RequestContext) {
  assertAuthorized(actor, "qualification.manage");

  if (!reason.trim()) {
    throw new QualificationServiceError("Informe o motivo da nova rodada de requalificação (RF-065).");
  }

  const latest = await prisma.qualification.findFirst({ where: { supplierId }, orderBy: { round: "desc" } });
  if (!latest) {
    throw new QualificationServiceError("Este fornecedor ainda não tem processo de qualificação iniciado.");
  }
  if (!latest.result) {
    throw new QualificationServiceError("A rodada atual ainda não foi decidida.");
  }

  const activeRequirements = await prisma.supplierRequirement.findMany({
    where: { supplierId, active: true },
    select: { id: true, requirementTypeId: true, obligation: true },
  });

  await prisma.$transaction(async (tx) => {
    const created = await tx.qualification.create({
      data: {
        supplierId,
        round: latest.round + 1,
        startedById: actor.id,
        matrixSnapshot: activeRequirements as unknown as Prisma.InputJsonValue,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "qualification.requalification.start",
        entityType: "Qualification",
        entityId: created.id,
        supplierId,
        reason: reason.trim(),
        after: { round: created.round },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Consulta (RF-061, INT-05, EXT)
// -----------------------------------------------------------------------------

export async function getQualificationOverview(actor: Actor, supplierId: string) {
  assertAuthorized(actor, "qualification.view", { supplierId });

  const rounds = await prisma.qualification.findMany({
    where: { supplierId },
    orderBy: { round: "desc" },
    include: {
      startedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
    },
  });

  const latestRound = rounds[0] ?? null;

  const requirementsWithCompliance = await loadActiveRequirementsWithCompliance(supplierId);
  const pendingObligatory = pendingObligatoryOf(requirementsWithCompliance);

  const status = computeQualificationStatus(
    latestRound ? { round: latestRound.round, result: latestRound.result } : null,
    pendingObligatory.length > 0,
  );

  return {
    status,
    rounds,
    latestRound,
    canDecideNow: Boolean(latestRound && !latestRound.result),
    canApproveNormally: canApproveNormally(pendingObligatory.length),
    pendingObligatory: pendingObligatory.map((r) => ({
      requirementTypeId: r.requirement.requirementTypeId,
      name: r.requirement.requirementType.name,
      complianceStatus: r.compliance.status,
    })),
  };
}

// -----------------------------------------------------------------------------
// Decisão (RF-063, RF-064, RF-066, RN-010, CA-09)
// -----------------------------------------------------------------------------

export interface DecideQualificationInput {
  qualificationId: string;
  result: QualificationResult;
  reason: string;
  conditionText?: string;
  conditionResponsible?: string;
  conditionDeadline?: Date;
  conditionEffect?: string;
}

export async function decideQualification(actor: Actor, input: DecideQualificationInput, context: RequestContext) {
  assertAuthorized(actor, "qualification.decide");

  if (!input.reason.trim()) {
    throw new QualificationServiceError("Informe a justificativa da decisão (RF-063).");
  }

  const round = await prisma.qualification.findUnique({ where: { id: input.qualificationId } });
  if (!round) throw new QualificationServiceError("Processo de qualificação não encontrado.");
  if (round.result) throw new QualificationServiceError("Esta rodada já tem uma decisão registrada.");

  const requirementsWithCompliance = await loadActiveRequirementsWithCompliance(round.supplierId);
  const pendingObligatory = pendingObligatoryOf(requirementsWithCompliance);

  // RF-066, RN-010, CA-09: aprovação normal é bloqueada com requisito
  // obrigatório não atendido. Exceção formal (RF-037) não foi implementada
  // (ver docs/DECISOES_PENDENTES.md, decisão já registrada na F3) — a única
  // via para publicar um resultado com pendência é "aprovado com ressalvas"
  // ou "reprovado".
  if (input.result === "APROVADO" && pendingObligatory.length > 0) {
    throw new QualificationServiceError(
      'Não é possível aprovar normalmente: há requisito obrigatório não atendido. Use "Aprovado com ressalvas" ou "Reprovado" (RN-010).',
    );
  }

  if (input.result === "APROVADO_COM_RESSALVAS" && (!input.conditionText?.trim() || !input.conditionDeadline)) {
    throw new QualificationServiceError("Ressalva exige condição e prazo (RF-064).");
  }

  const decisionSnapshot = requirementsWithCompliance.map((r) => ({
    requirementTypeId: r.requirement.requirementTypeId,
    requirementTypeName: r.requirement.requirementType.name,
    obligation: r.requirement.obligation,
    complianceStatus: r.compliance.status,
    currentVersionId: r.compliance.currentVersion?.id ?? null,
  }));

  const isRessalva = input.result === "APROVADO_COM_RESSALVAS";

  await prisma.$transaction(async (tx) => {
    await tx.qualification.update({
      where: { id: input.qualificationId },
      data: {
        result: input.result,
        decidedAt: new Date(),
        decidedById: actor.id,
        decisionReason: input.reason.trim(),
        decisionSnapshot: decisionSnapshot as unknown as Prisma.InputJsonValue,
        conditionText: isRessalva ? input.conditionText?.trim() ?? null : null,
        conditionResponsible: isRessalva ? input.conditionResponsible?.trim() || null : null,
        conditionDeadline: isRessalva ? input.conditionDeadline ?? null : null,
        conditionEffect: isRessalva ? input.conditionEffect?.trim() || null : null,
      },
    });

    // RF fluxo 6.1 passo 8: o sistema publica o resultado ao fornecedor —
    // visibilidade externa para aparecer na linha do tempo do portal.
    await recordAudit(
      {
        actorId: actor.id,
        action: "qualification.decide",
        entityType: "Qualification",
        entityId: input.qualificationId,
        supplierId: round.supplierId,
        reason: input.reason.trim(),
        before: { result: null },
        after: { result: input.result, round: round.round },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}
