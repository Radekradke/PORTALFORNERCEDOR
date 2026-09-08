import { randomUUID, createHash } from "node:crypto";
import type {
  Prisma,
  Criticality,
  NonConformityStatus,
  ActionPlanDecision,
  VerificationMethod,
  VerificationDecision,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { assertAuthorized, authorize } from "@/modules/auth-access/domain/authorize";
import { isExternal } from "@/modules/auth-access/domain/actor";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { getStorageProvider } from "@/lib/storage";
import { validateUploadedFile, mimeTypeFor } from "@/lib/file-validation";
import { suggestedDeadline } from "./nc-status";
import {
  createNotification,
  notifySupplierUsers,
  sendNotificationEmail,
  sendNotificationEmailToMany,
} from "@/modules/notifications/services/notification-service";

export class NonConformityServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

type TxClient = Prisma.TransactionClient;

function isUniqueCodeConflict(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

/**
 * RF-091: número único anual (NC-2026-0041). Conta quantas já existem no
 * ano e soma 1 — mesmo padrão leniente (sem lock explícito) já usado para
 * `DocumentVersion.versionNumber` (F3): o volume real deste MVP não chega
 * perto de uma colisão de concorrência genuína. `createNonConformity` e
 * `createNonConformityDraftFromInspectionAnswer` tratam a rara colisão com
 * retry (P2002 em `code`).
 */
async function nextNcCode(client: TxClient, year: number): Promise<string> {
  const count = await client.nonConformity.count({ where: { year } });
  return `NC-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function loadNc(id: string) {
  const nc = await prisma.nonConformity.findUnique({ where: { id } });
  if (!nc) throw new NonConformityServiceError("Não conformidade não encontrada.");
  return nc;
}

// -----------------------------------------------------------------------------
// Criação manual (RF-090, RF-091, RF-092) — QSMS
// -----------------------------------------------------------------------------

export interface CreateNonConformityInput {
  supplierId: string;
  categoryId?: string;
  severity: Criticality;
  description: string;
  responsibleInternalId: string;
  deadline?: Date; // se omitido, usa a sugestão de RN-017
}

export async function createNonConformity(actor: Actor, input: CreateNonConformityInput, context: RequestContext) {
  assertAuthorized(actor, "nc.manage");

  if (!input.description.trim()) {
    throw new NonConformityServiceError("Descreva a não conformidade.");
  }

  const year = new Date().getFullYear();
  const deadline = input.deadline ?? suggestedDeadline(input.severity);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      let notifiedSupplierUserIds: string[] = [];
      const nc = await prisma.$transaction(async (tx) => {
        const code = await nextNcCode(tx, year);
        const created = await tx.nonConformity.create({
          data: {
            code,
            year,
            supplierId: input.supplierId,
            origin: "MANUAL",
            categoryId: input.categoryId || null,
            severity: input.severity,
            description: input.description.trim(),
            responsibleInternalId: input.responsibleInternalId,
            deadline,
            // Criação manual já vem completa (RF-092 exige tudo de uma vez)
            // — sem sentido passar pelo rascunho (ver ABERTA no schema).
            status: "AGUARDANDO_PLANO",
            createdById: actor.id,
            openedAt: new Date(),
            openedById: actor.id,
          },
        });

        await recordAudit(
          {
            actorId: actor.id,
            action: "nc.create",
            entityType: "NonConformity",
            entityId: created.id,
            supplierId: input.supplierId,
            after: { code: created.code, severity: created.severity, deadline: created.deadline },
            context: auditCtx(context),
            visibility: "externa",
          },
          tx,
        );

        notifiedSupplierUserIds = await notifySupplierUsers(tx, input.supplierId, {
          type: "nc.create",
          title: `Nova não conformidade — ${created.code}`,
          message: `Uma não conformidade foi registrada (${created.code}). Envie o plano de ação até ${created.deadline.toLocaleDateString("pt-BR")}.`,
          link: "/portal-fornecedor/nao-conformidades",
        });

        // RF-090/RF-116: quem é designado responsável interno recebe o
        // aviso — exceto quando o próprio autor da NC se autodesignou (nesse
        // caso o alerta seria redundante).
        if (input.responsibleInternalId !== actor.id) {
          await createNotification(tx, {
            userId: input.responsibleInternalId,
            type: "nc.assigned",
            title: `Você é responsável pela NC ${created.code}`,
            message: `Você foi designado responsável interno pela não conformidade ${created.code}.`,
            link: "/nao-conformidades",
            supplierId: input.supplierId,
          });
        }

        return created;
      });

      const title = `Nova não conformidade — ${nc.code}`;
      const message = `Uma não conformidade foi registrada (${nc.code}). Envie o plano de ação até ${nc.deadline.toLocaleDateString("pt-BR")}.`;
      if (notifiedSupplierUserIds.length > 0) {
        await sendNotificationEmailToMany(notifiedSupplierUserIds, title, message, "/portal-fornecedor/nao-conformidades");
      }
      if (input.responsibleInternalId !== actor.id) {
        await sendNotificationEmail(
          input.responsibleInternalId,
          `Você é responsável pela NC ${nc.code}`,
          `Você foi designado responsável interno pela não conformidade ${nc.code}.`,
          "/nao-conformidades",
        );
      }

      return nc;
    } catch (err) {
      if (isUniqueCodeConflict(err) && attempt < 4) continue;
      throw err;
    }
  }
  throw new NonConformityServiceError("Não foi possível gerar o número da NC. Tente novamente.");
}

// -----------------------------------------------------------------------------
// Criação automática a partir de item de fiscalização (CA-14) — chamada de
// dentro da transação de conclusão da fiscalização (inspection-service.ts).
// -----------------------------------------------------------------------------

export interface InspectionOriginContext {
  inspectionId: string;
  supplierId: string;
  answerId: string;
  itemId: string;
  itemText: string;
  observation: string | null;
  defaultSeverity: Criticality | null;
}

export async function createNonConformityDraftFromInspectionAnswer(
  tx: TxClient,
  actor: Actor,
  origin: InspectionOriginContext,
  context: RequestContext,
) {
  const year = new Date().getFullYear();
  const severity = origin.defaultSeverity ?? "MEDIA";

  const code = await nextNcCode(tx, year);
  const nc = await tx.nonConformity.create({
    data: {
      code,
      year,
      supplierId: origin.supplierId,
      origin: "FISCALIZACAO",
      inspectionId: origin.inspectionId,
      inspectionAnswerId: origin.answerId,
      severity,
      description: `Item não conforme na fiscalização: "${origin.itemText}".${
        origin.observation ? ` Observação do fiscal: ${origin.observation}` : ""
      }`,
      // Quem concluiu a fiscalização vira responsável inicial — reatribuível
      // enquanto o rascunho está aberto (updateNonConformityDraft).
      responsibleInternalId: actor.id,
      deadline: suggestedDeadline(severity),
      status: "ABERTA",
      createdById: actor.id,
    },
  });

  await recordAudit(
    {
      actorId: actor.id,
      action: "nc.create.from_inspection",
      entityType: "NonConformity",
      entityId: nc.id,
      supplierId: origin.supplierId,
      after: { code: nc.code, inspectionId: origin.inspectionId, itemId: origin.itemId },
      context: auditCtx(context),
      // Ainda ABERTA (rascunho) — não é visível ao fornecedor (ver nc.view/getNonConformityDetail).
      visibility: "interna",
    },
    tx,
  );

  return nc;
}

// -----------------------------------------------------------------------------
// Rascunho automático: editar e confirmar (ABERTA -> AGUARDANDO_PLANO)
// -----------------------------------------------------------------------------

export interface UpdateNcDraftInput {
  categoryId?: string;
  severity?: Criticality;
  description?: string;
  responsibleInternalId?: string;
  deadline?: Date;
}

export async function updateNonConformityDraft(
  actor: Actor,
  ncId: string,
  input: UpdateNcDraftInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "nc.manage");
  const nc = await loadNc(ncId);
  if (nc.status !== "ABERTA") {
    throw new NonConformityServiceError("Só é possível editar enquanto a NC está em rascunho.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.nonConformity.update({
      where: { id: ncId },
      data: {
        categoryId: input.categoryId !== undefined ? input.categoryId || null : undefined,
        severity: input.severity,
        description: input.description?.trim(),
        responsibleInternalId: input.responsibleInternalId,
        deadline: input.deadline,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.draft.update",
        entityType: "NonConformity",
        entityId: ncId,
        supplierId: nc.supplierId,
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

export async function openNonConformity(actor: Actor, ncId: string, context: RequestContext) {
  assertAuthorized(actor, "nc.manage");
  const nc = await loadNc(ncId);
  if (nc.status !== "ABERTA") {
    throw new NonConformityServiceError("Esta NC já foi aberta ao fornecedor.");
  }

  const title = `Nova não conformidade — ${nc.code}`;
  const message = `Uma não conformidade foi registrada (${nc.code}). Envie o plano de ação até ${nc.deadline.toLocaleDateString("pt-BR")}.`;
  let notifiedUserIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.nonConformity.update({
      where: { id: ncId },
      data: { status: "AGUARDANDO_PLANO", openedAt: new Date(), openedById: actor.id },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.open",
        entityType: "NonConformity",
        entityId: ncId,
        supplierId: nc.supplierId,
        before: { status: "ABERTA" },
        after: { status: "AGUARDANDO_PLANO" },
        context: auditCtx(context),
        // RF fluxo 6.3: "o fornecedor recebe descrição, evidências, gravidade, prazo..." — publica.
        visibility: "externa",
      },
      tx,
    );

    notifiedUserIds = await notifySupplierUsers(tx, nc.supplierId, {
      type: "nc.open",
      title,
      message,
      link: "/portal-fornecedor/nao-conformidades",
    });
  });

  if (notifiedUserIds.length > 0) {
    await sendNotificationEmailToMany(notifiedUserIds, title, message, "/portal-fornecedor/nao-conformidades");
  }
}

// -----------------------------------------------------------------------------
// Plano de ação do fornecedor (RF-094)
// -----------------------------------------------------------------------------

export interface SaveActionPlanInput {
  cause?: string;
  correctiveAction?: string;
  responsibleName?: string;
  proposedDeadline?: Date;
  submit: boolean; // true = enviar para análise; false = só salvar rascunho
}

export async function saveActionPlan(actor: Actor, ncId: string, input: SaveActionPlanInput, context: RequestContext) {
  const nc = await loadNc(ncId);
  assertAuthorized(actor, "nc.respond", { supplierId: nc.supplierId });
  if (nc.status !== "AGUARDANDO_PLANO") {
    throw new NonConformityServiceError("O plano só pode ser editado enquanto a NC aguarda plano.");
  }
  if (input.submit && (!input.cause?.trim() || !input.correctiveAction?.trim() || !input.proposedDeadline)) {
    throw new NonConformityServiceError("Preencha causa, ação corretiva e prazo proposto antes de enviar (RF-094).");
  }

  await prisma.$transaction(async (tx) => {
    await tx.correctiveAction.upsert({
      where: { nonConformityId: ncId },
      update: {
        cause: input.cause?.trim(),
        correctiveAction: input.correctiveAction?.trim(),
        responsibleName: input.responsibleName?.trim(),
        proposedDeadline: input.proposedDeadline,
        submittedAt: input.submit ? new Date() : undefined,
        submittedById: input.submit ? actor.id : undefined,
        // Reenvio depois de "ajustes"/"rejeitado" começa um novo ciclo de revisão.
        ...(input.submit
          ? { reviewedAt: null, reviewedById: null, reviewDecision: null, reviewReason: null }
          : {}),
      },
      create: {
        nonConformityId: ncId,
        cause: input.cause?.trim() || null,
        correctiveAction: input.correctiveAction?.trim() || null,
        responsibleName: input.responsibleName?.trim() || null,
        proposedDeadline: input.proposedDeadline ?? null,
        submittedAt: input.submit ? new Date() : null,
        submittedById: input.submit ? actor.id : null,
      },
    });

    if (input.submit) {
      await tx.nonConformity.update({ where: { id: ncId }, data: { status: "PLANO_EM_ANALISE" } });
    }

    await recordAudit(
      {
        actorId: actor.id,
        action: input.submit ? "nc.plan.submit" : "nc.plan.save_draft",
        entityType: "CorrectiveAction",
        entityId: ncId,
        supplierId: nc.supplierId,
        context: auditCtx(context),
        visibility: input.submit ? "externa" : "interna",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Revisão do plano (RF-095) — QSMS ou Compras com NC_DECIDE
// -----------------------------------------------------------------------------

export interface DecideActionPlanInput {
  ncId: string;
  decision: ActionPlanDecision;
  reason?: string; // obrigatório quando não ACEITO
}

export async function decideActionPlan(actor: Actor, input: DecideActionPlanInput, context: RequestContext) {
  assertAuthorized(actor, "nc.decide");
  const nc = await loadNc(input.ncId);
  if (nc.status !== "PLANO_EM_ANALISE") {
    throw new NonConformityServiceError("Não há plano aguardando decisão para esta NC.");
  }
  if (input.decision !== "ACEITO" && !input.reason?.trim()) {
    throw new NonConformityServiceError("Informe a justificativa (RF-095).");
  }

  const nextStatus: NonConformityStatus = input.decision === "ACEITO" ? "EM_CORRECAO" : "AGUARDANDO_PLANO";

  const DECISION_LABELS: Record<ActionPlanDecision, string> = {
    ACEITO: "aceito",
    AJUSTES_SOLICITADOS: "devolvido para ajustes",
    REJEITADO: "rejeitado",
  };
  const title = `Plano de ação ${DECISION_LABELS[input.decision]} — ${nc.code}`;
  const message = `O plano de ação da não conformidade ${nc.code} foi ${DECISION_LABELS[input.decision]}.${
    input.reason?.trim() ? ` Motivo: ${input.reason.trim()}` : ""
  }`;
  let notifiedUserIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.correctiveAction.update({
      where: { nonConformityId: input.ncId },
      data: {
        reviewedAt: new Date(),
        reviewedById: actor.id,
        reviewDecision: input.decision,
        reviewReason: input.reason?.trim() || null,
      },
    });
    await tx.nonConformity.update({ where: { id: input.ncId }, data: { status: nextStatus } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.plan.decide",
        entityType: "CorrectiveAction",
        entityId: input.ncId,
        supplierId: nc.supplierId,
        reason: input.reason?.trim() || null,
        before: { status: "PLANO_EM_ANALISE" },
        after: { status: nextStatus, decision: input.decision },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );

    notifiedUserIds = await notifySupplierUsers(tx, nc.supplierId, {
      type: "nc.plan.decide",
      title,
      message,
      link: "/portal-fornecedor/nao-conformidades",
    });
  });

  if (notifiedUserIds.length > 0) {
    await sendNotificationEmailToMany(notifiedUserIds, title, message, "/portal-fornecedor/nao-conformidades");
  }
}

// -----------------------------------------------------------------------------
// Correção: evidência (fluxo 6.3, "adiciona evidências... sem apagar as
// anteriores") e sinalização de pronto para verificação
// -----------------------------------------------------------------------------

export interface AddCorrectionEvidenceInput {
  file: { buffer: Buffer; originalName: string };
  description?: string;
}

export async function addCorrectionEvidence(
  actor: Actor,
  ncId: string,
  input: AddCorrectionEvidenceInput,
  context: RequestContext,
) {
  const nc = await loadNc(ncId);
  assertAuthorized(actor, "nc.respond", { supplierId: nc.supplierId });
  if (nc.status !== "EM_CORRECAO") {
    throw new NonConformityServiceError("Só é possível anexar evidência de correção enquanto a NC está em correção.");
  }

  const actionPlan = await prisma.correctiveAction.findUnique({ where: { nonConformityId: ncId } });
  if (!actionPlan) throw new NonConformityServiceError("Envie o plano de ação antes de anexar evidência de correção.");

  const env = getEnv();
  const validation = validateUploadedFile(input.file.buffer, env.MAX_UPLOAD_SIZE_MB * 1024 * 1024);
  if (!validation.ok || !validation.detectedType) {
    throw new NonConformityServiceError(validation.error ?? "Arquivo inválido.");
  }

  const checksum = createHash("sha256").update(input.file.buffer).digest("hex");
  const extension = validation.detectedType.toLowerCase();
  const storageKey = `nao-conformidades/${nc.supplierId}/${ncId}/${randomUUID()}.${extension}`;
  await getStorageProvider().putObject({
    key: storageKey,
    body: input.file.buffer,
    contentType: mimeTypeFor(validation.detectedType),
  });

  await prisma.$transaction(async (tx) => {
    const fileObject = await tx.fileObject.create({
      data: {
        originalName: input.file.originalName.slice(0, 255),
        mimeType: mimeTypeFor(validation.detectedType!),
        sizeBytes: input.file.buffer.length,
        checksumSha256: checksum,
        storageKey,
        uploadedById: actor.id,
      },
    });
    await tx.evidence.create({
      data: {
        fileObjectId: fileObject.id,
        uploadedById: actor.id,
        description: input.description?.trim() || null,
        correctiveActionId: actionPlan.id,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.correction_evidence.add",
        entityType: "CorrectiveAction",
        entityId: actionPlan.id,
        supplierId: nc.supplierId,
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

export async function submitForVerification(actor: Actor, ncId: string, context: RequestContext) {
  const nc = await loadNc(ncId);
  assertAuthorized(actor, "nc.respond", { supplierId: nc.supplierId });
  if (nc.status !== "EM_CORRECAO") {
    throw new NonConformityServiceError("A NC não está em correção.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.correctiveAction.update({
      where: { nonConformityId: ncId },
      data: { readyForVerificationAt: new Date() },
    });
    await tx.nonConformity.update({ where: { id: ncId }, data: { status: "AGUARDANDO_VERIFICACAO" } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.correction.submit_for_verification",
        entityType: "NonConformity",
        entityId: ncId,
        supplierId: nc.supplierId,
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Verificação (RF-096) — QSMS
// -----------------------------------------------------------------------------

export interface VerifyCorrectionInput {
  ncId: string;
  method: VerificationMethod;
  decision: VerificationDecision;
  note?: string;
}

export async function verifyCorrection(actor: Actor, input: VerifyCorrectionInput, context: RequestContext) {
  assertAuthorized(actor, "nc.verify");
  const nc = await loadNc(input.ncId);
  if (nc.status !== "AGUARDANDO_VERIFICACAO") {
    throw new NonConformityServiceError("Esta NC não está aguardando verificação.");
  }
  if (input.decision === "REJEITADA" && !input.note?.trim()) {
    throw new NonConformityServiceError("Informe a orientação para o fornecedor ao devolver a correção.");
  }

  const nextStatus: NonConformityStatus = input.decision === "APROVADA" ? "ENCERRADA" : "EM_CORRECAO";

  const title =
    input.decision === "APROVADA" ? `Não conformidade encerrada — ${nc.code}` : `Correção devolvida — ${nc.code}`;
  const message =
    input.decision === "APROVADA"
      ? `A correção da não conformidade ${nc.code} foi verificada e aprovada. A NC está encerrada.`
      : `A correção da não conformidade ${nc.code} foi devolvida. Orientação: ${input.note?.trim() ?? ""}`;
  let notifiedUserIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    await tx.correctiveAction.update({
      where: { nonConformityId: input.ncId },
      data: {
        verifiedAt: new Date(),
        verifiedById: actor.id,
        verificationMethod: input.method,
        verificationDecision: input.decision,
        verificationNote: input.note?.trim() || null,
      },
    });
    await tx.nonConformity.update({
      where: { id: input.ncId },
      data: {
        status: nextStatus,
        // Só marca o encerramento atual quando aprovado — uma rejeição não
        // mexe num `closedAt` de um ciclo anterior (RF-097, "sem apagar
        // encerramento anterior").
        ...(input.decision === "APROVADA" ? { closedAt: new Date(), closedById: actor.id } : {}),
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.verify",
        entityType: "NonConformity",
        entityId: input.ncId,
        supplierId: nc.supplierId,
        reason: input.note?.trim() || null,
        before: { status: "AGUARDANDO_VERIFICACAO" },
        after: { status: nextStatus, decision: input.decision },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );

    notifiedUserIds = await notifySupplierUsers(tx, nc.supplierId, {
      type: "nc.verify",
      title,
      message,
      link: "/portal-fornecedor/nao-conformidades",
    });
  });

  if (notifiedUserIds.length > 0) {
    await sendNotificationEmailToMany(notifiedUserIds, title, message, "/portal-fornecedor/nao-conformidades");
  }
}

// -----------------------------------------------------------------------------
// Reabertura (RF-097) — permissão sensível NC_REOPEN
// -----------------------------------------------------------------------------

const REOPEN_TARGETS: NonConformityStatus[] = ["AGUARDANDO_PLANO", "EM_CORRECAO", "AGUARDANDO_VERIFICACAO"];

export interface ReopenNonConformityInput {
  ncId: string;
  reason: string;
  newDeadline: Date;
  targetStatus: NonConformityStatus;
}

export async function reopenNonConformity(actor: Actor, input: ReopenNonConformityInput, context: RequestContext) {
  assertAuthorized(actor, "nc.reopen");
  const nc = await loadNc(input.ncId);
  if (nc.status !== "ENCERRADA") {
    throw new NonConformityServiceError("Só é possível reabrir uma NC encerrada.");
  }
  if (!input.reason.trim()) {
    throw new NonConformityServiceError("Informe o motivo da reabertura (RF-097).");
  }
  if (!REOPEN_TARGETS.includes(input.targetStatus)) {
    throw new NonConformityServiceError("Estado de destino inválido para reabertura.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.nonConformity.update({
      where: { id: input.ncId },
      data: {
        status: input.targetStatus,
        deadline: input.newDeadline,
        reopenedAt: new Date(),
        reopenedById: actor.id,
        reopenReason: input.reason.trim(),
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "nc.reopen",
        entityType: "NonConformity",
        entityId: input.ncId,
        supplierId: nc.supplierId,
        reason: input.reason.trim(),
        before: { status: "ENCERRADA" },
        after: { status: input.targetStatus, deadline: input.newDeadline },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export interface ListNcFilters {
  supplierId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listNonConformities(actor: Actor, filters: ListNcFilters = {}) {
  const external = isExternal(actor);
  const supplierId = external ? actor.supplierId ?? undefined : filters.supplierId;
  assertAuthorized(actor, "nc.view", supplierId ? { supplierId } : undefined);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;

  const where: Prisma.NonConformityWhereInput = {
    ...(supplierId ? { supplierId } : {}),
    // Rascunho automático (CA-14) nunca aparece ao fornecedor.
    ...(external ? { status: { not: "ABERTA" } } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.nonConformity.count({ where }),
    prisma.nonConformity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, legalName: true } },
        responsibleInternal: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getNonConformityDetail(actor: Actor, ncId: string) {
  const nc = await prisma.nonConformity.findUnique({
    where: { id: ncId },
    include: {
      supplier: { select: { id: true, legalName: true } },
      category: true,
      responsibleInternal: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      reopenedBy: { select: { id: true, name: true } },
      inspectionAnswer: { include: { evidences: { include: { fileObject: true } } } },
      evidences: { include: { fileObject: true } },
      actionPlan: {
        include: {
          evidences: { include: { fileObject: true } },
          reviewedBy: { select: { id: true, name: true } },
          verifiedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!nc) return null;

  // Não-throwing por design (mesmo padrão de getInspectionDetail, F5): não
  // vaza "existe mas não é seu" via erro de autorização.
  if (!authorize(actor, "nc.view", { supplierId: nc.supplierId })) return null;
  if (isExternal(actor) && nc.status === "ABERTA") return null;

  return nc;
}

/** Responsáveis elegíveis (Compras/QSMS ativos) para o campo "responsável interno" da NC. */
export async function listAssignableNcResponsibles(actor: Actor) {
  assertAuthorized(actor, "nc.manage");
  return prisma.user.findMany({
    where: { role: { in: ["COMPRAS", "QSMS"] }, status: "ACTIVE" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
