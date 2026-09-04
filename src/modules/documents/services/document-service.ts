import { randomUUID, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { getStorageProvider } from "@/lib/storage";
import { validateUploadedFile, mimeTypeFor } from "@/lib/file-validation";
import { computeDocumentCompliance } from "./document-compliance";

export class DocumentServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

// -----------------------------------------------------------------------------
// Consulta (RF-043, EXT-04, INT-06)
// -----------------------------------------------------------------------------

export async function listSupplierRequirements(actor: Actor, supplierId: string) {
  assertAuthorized(actor, "document.view", { supplierId });

  const requirements = await prisma.supplierRequirement.findMany({
    where: { supplierId, active: true },
    include: {
      requirementType: true,
      versions: { orderBy: { versionNumber: "desc" } },
    },
    orderBy: { requirementType: { name: "asc" } },
  });

  return requirements.map((req) => ({
    ...req,
    compliance: computeDocumentCompliance(req, req.versions, req.requirementType.alertWindowDays),
  }));
}

export async function getRequirementDetail(actor: Actor, requirementId: string) {
  const requirement = await prisma.supplierRequirement.findUnique({
    where: { id: requirementId },
    include: {
      requirementType: true,
      supplier: { select: { id: true, legalName: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          fileObject: true,
          submittedBy: { select: { name: true, email: true } },
          reviewedBy: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!requirement) return null;

  assertAuthorized(actor, "document.view", { supplierId: requirement.supplierId });

  return {
    ...requirement,
    compliance: computeDocumentCompliance(requirement, requirement.versions, requirement.requirementType.alertWindowDays),
  };
}

/** Detalhe de uma versão específica para a tela de análise (INT-07). */
export async function getDocumentVersionDetail(actor: Actor, versionId: string) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: {
      fileObject: true,
      submittedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      supplierRequirement: {
        include: {
          requirementType: true,
          supplier: { select: { id: true, legalName: true, criticality: true } },
          versions: {
            orderBy: { versionNumber: "desc" },
            include: {
              fileObject: true,
              submittedBy: { select: { name: true } },
              reviewedBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!version) return null;

  assertAuthorized(actor, "document.view", { supplierId: version.supplierRequirement.supplierId });

  return version;
}

/** Fila de documentos aguardando análise entre todos os fornecedores (RF-043, INT-06). */
export async function listDocumentQueue(actor: Actor) {
  assertAuthorized(actor, "document.view");

  const versions = await prisma.documentVersion.findMany({
    where: { status: { in: ["ENVIADO", "EM_ANALISE"] } },
    orderBy: { createdAt: "asc" }, // mais antigos primeiro (idade, RF-043)
    include: {
      supplierRequirement: {
        include: { requirementType: true, supplier: { select: { id: true, legalName: true, criticality: true } } },
      },
      submittedBy: { select: { name: true } },
    },
  });

  return versions;
}

// -----------------------------------------------------------------------------
// Envio (RF-040, RF-041, RF-042) — fornecedor
// -----------------------------------------------------------------------------

export interface UploadDocumentInput {
  supplierRequirementId: string;
  file: Buffer;
  originalName: string;
  documentNumber?: string;
  issuer?: string;
  issuedAt?: Date;
  validUntil?: Date; // obrigatório quando o tipo usa validade INFORMADA
  submitterNote?: string;
}

export async function uploadDocumentVersion(actor: Actor, input: UploadDocumentInput, context: RequestContext) {
  const requirement = await prisma.supplierRequirement.findUnique({
    where: { id: input.supplierRequirementId },
    include: { requirementType: true },
  });
  if (!requirement) throw new DocumentServiceError("Requisito não encontrado.");

  assertAuthorized(actor, "document.upload", { supplierId: requirement.supplierId });

  if (!requirement.active) {
    throw new DocumentServiceError("Este requisito não está mais aplicável ao fornecedor.");
  }

  const env = getEnv();
  const validation = validateUploadedFile(
    input.file,
    env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    requirement.requirementType.allowedFormats,
  );
  if (!validation.ok || !validation.detectedType) {
    throw new DocumentServiceError(validation.error ?? "Arquivo inválido.");
  }

  if (requirement.requirementType.needsIssueDate && !input.issuedAt) {
    throw new DocumentServiceError("Este documento exige a data de emissão.");
  }

  let validUntil: Date | null = null;
  if (requirement.requirementType.validityType === "FIXA") {
    if (!input.issuedAt || !requirement.requirementType.validityDays) {
      throw new DocumentServiceError("Não foi possível calcular a validade — informe a data de emissão.");
    }
    validUntil = new Date(input.issuedAt);
    validUntil.setDate(validUntil.getDate() + requirement.requirementType.validityDays);
  } else if (requirement.requirementType.validityType === "INFORMADA") {
    if (!input.validUntil) {
      throw new DocumentServiceError("Informe a data de validade deste documento.");
    }
    validUntil = input.validUntil;
  }

  const checksum = createHash("sha256").update(input.file).digest("hex");
  const extension = validation.detectedType.toLowerCase();
  const storageKey = `documentos/${requirement.supplierId}/${requirement.id}/${randomUUID()}.${extension}`;

  await getStorageProvider().putObject({
    key: storageKey,
    body: input.file,
    contentType: mimeTypeFor(validation.detectedType),
  });

  const lastVersion = await prisma.documentVersion.findFirst({
    where: { supplierRequirementId: requirement.id },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const created = await prisma.$transaction(async (tx) => {
    const fileObject = await tx.fileObject.create({
      data: {
        originalName: input.originalName.slice(0, 255),
        mimeType: mimeTypeFor(validation.detectedType!),
        sizeBytes: input.file.length,
        checksumSha256: checksum,
        storageKey,
        uploadedById: actor.id,
      },
    });

    const version = await tx.documentVersion.create({
      data: {
        supplierRequirementId: requirement.id,
        versionNumber,
        fileObjectId: fileObject.id,
        documentNumber: input.documentNumber?.trim() || null,
        issuer: input.issuer?.trim() || null,
        issuedAt: input.issuedAt ?? null,
        validUntil,
        submitterNote: input.submitterNote?.trim() || null,
        status: "ENVIADO",
        submittedById: actor.id,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "document.version.upload",
        entityType: "DocumentVersion",
        entityId: version.id,
        supplierId: requirement.supplierId,
        after: { requirementType: requirement.requirementType.code, versionNumber },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );

    return version;
  });

  return created;
}

// -----------------------------------------------------------------------------
// Análise (RF-043 a RF-047) — QSMS
// -----------------------------------------------------------------------------

async function loadVersionForReview(versionId: string) {
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { supplierRequirement: true },
  });
  if (!version) throw new DocumentServiceError("Versão de documento não encontrada.");
  return version;
}

export async function startDocumentReview(actor: Actor, versionId: string, context: RequestContext) {
  assertAuthorized(actor, "document.review");
  const version = await loadVersionForReview(versionId);

  if (version.status !== "ENVIADO") {
    throw new DocumentServiceError("Este documento não está aguardando início de análise.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentVersion.update({ where: { id: versionId }, data: { status: "EM_ANALISE" } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "document.review.start",
        entityType: "DocumentVersion",
        entityId: versionId,
        supplierId: version.supplierRequirement.supplierId,
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

export interface ApproveDocumentInput {
  versionId: string;
  validUntilOverride?: Date;
  reason?: string; // parecer opcional
}

/** RF-046: aprovar e confirmar a validade efetiva (pode ajustar a informada/calculada). */
export async function approveDocumentVersion(actor: Actor, input: ApproveDocumentInput, context: RequestContext) {
  assertAuthorized(actor, "document.review");
  const version = await loadVersionForReview(input.versionId);

  if (!["ENVIADO", "EM_ANALISE"].includes(version.status)) {
    throw new DocumentServiceError("Este documento não está em um estado analisável.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentVersion.update({
      where: { id: input.versionId },
      data: {
        status: "APROVADO",
        validUntil: input.validUntilOverride ?? version.validUntil,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewReason: input.reason?.trim() || null,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "document.version.approve",
        entityType: "DocumentVersion",
        entityId: input.versionId,
        supplierId: version.supplierRequirement.supplierId,
        reason: input.reason?.trim() || null,
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

export interface RejectDocumentInput {
  versionId: string;
  reason: string; // obrigatório e visível externamente (RN-009)
  internalNote?: string; // nunca exposto ao fornecedor (RF-050)
}

export async function rejectDocumentVersion(actor: Actor, input: RejectDocumentInput, context: RequestContext) {
  assertAuthorized(actor, "document.review");
  if (!input.reason.trim()) {
    throw new DocumentServiceError("Informe o motivo da rejeição — ele será exibido ao fornecedor (RN-009).");
  }

  const version = await loadVersionForReview(input.versionId);
  if (!["ENVIADO", "EM_ANALISE"].includes(version.status)) {
    throw new DocumentServiceError("Este documento não está em um estado analisável.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.documentVersion.update({
      where: { id: input.versionId },
      data: {
        status: "REJEITADO",
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewReason: input.reason.trim(),
        internalNote: input.internalNote?.trim() || null,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "document.version.reject",
        entityType: "DocumentVersion",
        entityId: input.versionId,
        supplierId: version.supplierRequirement.supplierId,
        reason: input.reason.trim(),
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Download privado (RNF-003, RF-045)
// -----------------------------------------------------------------------------

export async function getDownloadUrlForVersion(
  actor: Actor,
  versionId: string,
  context: RequestContext,
): Promise<string> {
  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { supplierRequirement: true, fileObject: true },
  });
  if (!version) throw new DocumentServiceError("Documento não encontrado.");

  assertAuthorized(actor, "document.view", { supplierId: version.supplierRequirement.supplierId });

  // RF-118/RNF-004: acesso a arquivo sensível é auditado (sem logar o conteúdo).
  await recordAudit({
    actorId: actor.id,
    action: "document.version.download",
    entityType: "DocumentVersion",
    entityId: versionId,
    supplierId: version.supplierRequirement.supplierId,
    context: auditCtx(context),
    visibility: "interna",
  });

  // URL temporária — nunca um link permanente/adivinhável (RNF-003).
  return getStorageProvider().getSignedDownloadUrl(version.fileObject.storageKey, 60);
}
