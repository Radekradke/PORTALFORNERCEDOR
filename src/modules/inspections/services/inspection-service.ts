import { randomUUID, createHash } from "node:crypto";
import type { InspectionResponse, InspectionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { assertAuthorized, authorize } from "@/modules/auth-access/domain/authorize";
import { isExternal } from "@/modules/auth-access/domain/actor";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { getStorageProvider } from "@/lib/storage";
import { validateUploadedFile, mimeTypeFor } from "@/lib/file-validation";
import { evaluateInspection, type ChecklistSectionSnapshot } from "./inspection-result";

export class InspectionServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

function parseSnapshot(json: Prisma.JsonValue): ChecklistSectionSnapshot[] {
  return json as unknown as ChecklistSectionSnapshot[];
}

// -----------------------------------------------------------------------------
// Programação (RF-075) — congela o checklist no instante da criação
// (RF-074, RN-013): edições futuras do modelo nunca afetam esta fiscalização.
// -----------------------------------------------------------------------------

export interface ScheduleInspectionInput {
  supplierId: string;
  templateId: string;
  inspectorId: string;
  scheduledAt: Date;
  projectOrLocation?: string;
  type?: string;
}

/** Fiscais elegíveis para programar uma fiscalização: usuários QSMS ativos. */
export async function listAssignableInspectors(actor: Actor) {
  assertAuthorized(actor, "inspection.manage");

  return prisma.user.findMany({
    where: { role: "QSMS", status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function scheduleInspection(actor: Actor, input: ScheduleInspectionInput, context: RequestContext) {
  assertAuthorized(actor, "inspection.manage");

  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId }, select: { id: true } });
  if (!supplier) throw new InspectionServiceError("Fornecedor não encontrado.");

  const inspector = await prisma.user.findUnique({ where: { id: input.inspectorId } });
  if (!inspector || inspector.role !== "QSMS" || inspector.status !== "ACTIVE") {
    throw new InspectionServiceError("Selecione um fiscal ativo do time QSMS.");
  }

  const template = await prisma.checklistTemplate.findUnique({
    where: { id: input.templateId },
    include: { sections: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } } },
  });
  if (!template || !template.active) {
    throw new InspectionServiceError("Selecione um checklist ativo.");
  }
  const itemCount = template.sections.reduce((acc, s) => acc + s.items.length, 0);
  if (itemCount === 0) {
    throw new InspectionServiceError("Este checklist ainda não tem itens — adicione ao menos um antes de programar.");
  }

  const checklistSnapshot: ChecklistSectionSnapshot[] = template.sections.map((section) => ({
    id: section.id,
    title: section.title,
    order: section.order,
    items: section.items.map((item) => ({
      id: item.id,
      text: item.text,
      guidance: item.guidance,
      allowedResponses: item.allowedResponses,
      evidenceRequiredOn: item.evidenceRequiredOn,
      observationRequiredOn: item.observationRequiredOn,
      generatesNonConformity: item.generatesNonConformity,
      defaultSeverity: item.defaultSeverity,
    })),
  }));

  return prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.create({
      data: {
        supplierId: input.supplierId,
        templateId: input.templateId,
        checklistSnapshot: checklistSnapshot as unknown as Prisma.InputJsonValue,
        projectOrLocation: input.projectOrLocation?.trim() || null,
        type: input.type?.trim() || null,
        scheduledAt: input.scheduledAt,
        inspectorId: input.inspectorId,
        createdById: actor.id,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "inspection.schedule",
        entityType: "Inspection",
        entityId: inspection.id,
        supplierId: input.supplierId,
        after: { templateTitle: template.title, scheduledAt: input.scheduledAt, inspectorId: input.inspectorId },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );

    return inspection;
  });
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export interface ListInspectionsFilters {
  supplierId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listInspections(actor: Actor, filters: ListInspectionsFilters = {}) {
  const external = isExternal(actor);
  const supplierId = external ? actor.supplierId ?? undefined : filters.supplierId;
  assertAuthorized(actor, "inspection.view", supplierId ? { supplierId } : undefined);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;

  const where: Prisma.InspectionWhereInput = {
    ...(supplierId ? { supplierId } : {}),
    // RF-133, EXT-05: o portal externo só mostra resultados liberados —
    // nesta fatia isso significa "fiscalização concluída", sem um flag de
    // liberação manual separado (ver docs/DECISOES_PENDENTES.md).
    ...(external ? { status: "CONCLUIDA" as InspectionStatus } : filters.status ? { status: filters.status as InspectionStatus } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.inspection.count({ where }),
    prisma.inspection.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, legalName: true } },
        inspector: { select: { id: true, name: true } },
        template: { select: { id: true, title: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getInspectionDetail(actor: Actor, inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      supplier: { select: { id: true, legalName: true } },
      inspector: { select: { id: true, name: true } },
      concludedBy: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
      template: { select: { id: true, title: true } },
      answers: { include: { evidences: { include: { fileObject: true } } } },
    },
  });
  if (!inspection) return null;

  // Não-throwing de propósito: esta função é chamada a partir de uma rota
  // com ID arbitrário na URL tanto interna quanto externa (portal do
  // fornecedor). Lançar aqui deixaria a página quebrar com erro 500 em vez
  // de simplesmente "não encontrado" — mesma isolação (RN-021, CA-03), sem
  // vazar a diferença entre "não existe" e "existe mas não é seu".
  if (!authorize(actor, "inspection.view", { supplierId: inspection.supplierId })) {
    return null;
  }

  // RN-021/RF-133: fornecedor nunca vê uma fiscalização ainda não concluída.
  if (isExternal(actor) && inspection.status !== "CONCLUIDA") {
    return null;
  }

  const sections = parseSnapshot(inspection.checklistSnapshot);
  const answersByItem = new Map(inspection.answers.map((a) => [a.itemId, a]));
  const evaluation = evaluateInspection(
    sections,
    inspection.answers.map((a) => ({
      itemId: a.itemId,
      response: a.response,
      observation: a.observation,
      hasEvidence: a.evidences.length > 0,
    })),
  );

  return { ...inspection, sections, answersByItem, evaluation };
}

// -----------------------------------------------------------------------------
// Execução (RF-076 a RF-080) — QSMS
// -----------------------------------------------------------------------------

export interface SaveAnswerInput {
  inspectionId: string;
  itemId: string;
  response?: InspectionResponse;
  observation?: string;
  file?: { buffer: Buffer; originalName: string };
}

async function loadEditableInspection(inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
  if (!inspection) throw new InspectionServiceError("Fiscalização não encontrada.");
  if (inspection.status === "CONCLUIDA" || inspection.status === "CANCELADA") {
    throw new InspectionServiceError("Esta fiscalização já foi encerrada e não pode mais ser alterada (RN-019).");
  }
  return inspection;
}

export async function saveAnswer(actor: Actor, input: SaveAnswerInput, context: RequestContext) {
  assertAuthorized(actor, "inspection.manage");

  const inspection = await loadEditableInspection(input.inspectionId);
  const sections = parseSnapshot(inspection.checklistSnapshot);
  const item = sections.flatMap((s) => s.items).find((i) => i.id === input.itemId);
  if (!item) throw new InspectionServiceError("Item não encontrado neste checklist.");

  if (input.response && !item.allowedResponses.includes(input.response)) {
    throw new InspectionServiceError("Esta resposta não é permitida para este item.");
  }

  let evidenceUpload: { storageKey: string; checksum: string; detectedType: string; mimeType: string } | null = null;
  if (input.file) {
    const env = getEnv();
    const validation = validateUploadedFile(input.file.buffer, env.MAX_UPLOAD_SIZE_MB * 1024 * 1024);
    if (!validation.ok || !validation.detectedType) {
      throw new InspectionServiceError(validation.error ?? "Arquivo inválido.");
    }
    const checksum = createHash("sha256").update(input.file.buffer).digest("hex");
    const extension = validation.detectedType.toLowerCase();
    const storageKey = `evidencias/${inspection.supplierId}/${inspection.id}/${input.itemId}/${randomUUID()}.${extension}`;
    await getStorageProvider().putObject({
      key: storageKey,
      body: input.file.buffer,
      contentType: mimeTypeFor(validation.detectedType),
    });
    evidenceUpload = { storageKey, checksum, detectedType: validation.detectedType, mimeType: mimeTypeFor(validation.detectedType) };
  }

  const answer = await prisma.$transaction(async (tx) => {
    if (inspection.status === "PROGRAMADA") {
      await tx.inspection.update({ where: { id: inspection.id }, data: { status: "EM_ANDAMENTO", startedAt: new Date() } });
    }

    const saved = await tx.inspectionAnswer.upsert({
      where: { inspectionId_itemId: { inspectionId: input.inspectionId, itemId: input.itemId } },
      update: {
        response: input.response ?? undefined,
        observation: input.observation !== undefined ? input.observation.trim() || null : undefined,
        answeredAt: input.response ? new Date() : undefined,
        answeredById: input.response ? actor.id : undefined,
      },
      create: {
        inspectionId: input.inspectionId,
        itemId: input.itemId,
        response: input.response ?? null,
        observation: input.observation?.trim() || null,
        answeredAt: input.response ? new Date() : null,
        answeredById: input.response ? actor.id : null,
      },
    });

    if (evidenceUpload && input.file) {
      const fileObject = await tx.fileObject.create({
        data: {
          originalName: input.file.originalName.slice(0, 255),
          mimeType: evidenceUpload.mimeType,
          sizeBytes: input.file.buffer.length,
          checksumSha256: evidenceUpload.checksum,
          storageKey: evidenceUpload.storageKey,
          uploadedById: actor.id,
        },
      });
      await tx.evidence.create({
        data: { inspectionAnswerId: saved.id, fileObjectId: fileObject.id, uploadedById: actor.id },
      });
    }

    await recordAudit(
      {
        actorId: actor.id,
        action: "inspection.answer.save",
        entityType: "InspectionAnswer",
        entityId: saved.id,
        supplierId: inspection.supplierId,
        after: { itemId: input.itemId, response: input.response ?? null, hasNewEvidence: Boolean(evidenceUpload) },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );

    return saved;
  });

  return answer;
}

// -----------------------------------------------------------------------------
// Conclusão e cancelamento (RF-079, RF-080, RF-082, RN-015, RN-019)
// -----------------------------------------------------------------------------

export async function concludeInspection(actor: Actor, inspectionId: string, context: RequestContext) {
  assertAuthorized(actor, "inspection.manage");

  const inspection = await loadEditableInspection(inspectionId);
  const sections = parseSnapshot(inspection.checklistSnapshot);
  const answers = await prisma.inspectionAnswer.findMany({
    where: { inspectionId },
    include: { evidences: { select: { id: true } } },
  });

  const evaluation = evaluateInspection(
    sections,
    answers.map((a) => ({ itemId: a.itemId, response: a.response, observation: a.observation, hasEvidence: a.evidences.length > 0 })),
  );

  if (!evaluation.canConclude) {
    const itemsById = new Map(sections.flatMap((s) => s.items).map((i) => [i.id, i]));
    const summary = evaluation.issues
      .slice(0, 5)
      .map((issue) => itemsById.get(issue.itemId)?.text ?? issue.itemId)
      .join("; ");
    throw new InspectionServiceError(
      `Não é possível concluir: há itens pendentes (RF-078). Verifique: ${summary}${evaluation.issues.length > 5 ? "…" : ""}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.inspection.update({
      where: { id: inspectionId },
      data: {
        status: "CONCLUIDA",
        concludedAt: new Date(),
        concludedById: actor.id,
        conformityPercentage: evaluation.conformityPercentage,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "inspection.conclude",
        entityType: "Inspection",
        entityId: inspectionId,
        supplierId: inspection.supplierId,
        after: { conformityPercentage: evaluation.conformityPercentage, counts: evaluation.counts },
        context: auditCtx(context),
        // RF fluxo 6.2: a fiscalização concluída fica disponível no
        // prontuário do fornecedor — publica o resultado (EXT-05, RF-133).
        visibility: "externa",
      },
      tx,
    );
  });

  return evaluation;
}

export async function cancelInspection(actor: Actor, inspectionId: string, reason: string, context: RequestContext) {
  assertAuthorized(actor, "inspection.manage");

  if (!reason.trim()) {
    throw new InspectionServiceError("Informe o motivo do cancelamento (RF-082).");
  }

  const inspection = await loadEditableInspection(inspectionId);

  await prisma.$transaction(async (tx) => {
    await tx.inspection.update({
      where: { id: inspectionId },
      data: { status: "CANCELADA", cancelledAt: new Date(), cancelledById: actor.id, cancelReason: reason.trim() },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "inspection.cancel",
        entityType: "Inspection",
        entityId: inspectionId,
        supplierId: inspection.supplierId,
        reason: reason.trim(),
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Download privado de evidência (RNF-003, mesmo padrão de documentos)
// -----------------------------------------------------------------------------

export async function getEvidenceDownloadUrl(actor: Actor, evidenceId: string, context: RequestContext): Promise<string> {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { fileObject: true, inspectionAnswer: { include: { inspection: true } } },
  });
  if (!evidence) throw new InspectionServiceError("Evidência não encontrada.");

  const inspection = evidence.inspectionAnswer.inspection;
  assertAuthorized(actor, "inspection.view", { supplierId: inspection.supplierId });
  if (isExternal(actor) && inspection.status !== "CONCLUIDA") {
    throw new InspectionServiceError("Evidência não encontrada.");
  }

  await recordAudit({
    actorId: actor.id,
    action: "inspection.evidence.download",
    entityType: "Evidence",
    entityId: evidenceId,
    supplierId: inspection.supplierId,
    context: auditCtx(context),
    visibility: "interna",
  });

  return getStorageProvider().getSignedDownloadUrl(evidence.fileObject.storageKey, 60);
}
