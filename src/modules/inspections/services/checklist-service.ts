import type { InspectionResponse, Criticality } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";

export class ChecklistServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

// -----------------------------------------------------------------------------
// Modelo de checklist (RF-070) — autoria é sempre no "vivo"; RN-013
// (checklist congelado) é garantida no momento em que a fiscalização é
// criada (inspection-service.scheduleInspection), não aqui.
// -----------------------------------------------------------------------------

export interface CreateTemplateInput {
  title: string;
  description?: string;
  categoryId?: string;
}

export async function createChecklistTemplate(actor: Actor, input: CreateTemplateInput, context: RequestContext) {
  assertAuthorized(actor, "checklist.manage");

  if (!input.title.trim()) {
    throw new ChecklistServiceError("Informe o título do checklist.");
  }

  return prisma.$transaction(async (tx) => {
    const template = await tx.checklistTemplate.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        categoryId: input.categoryId || null,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "checklist.template.create",
        entityType: "ChecklistTemplate",
        entityId: template.id,
        after: { title: template.title },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );

    return template;
  });
}

export async function setChecklistTemplateActive(
  actor: Actor,
  templateId: string,
  active: boolean,
  context: RequestContext,
) {
  assertAuthorized(actor, "checklist.manage");

  await prisma.$transaction(async (tx) => {
    await tx.checklistTemplate.update({ where: { id: templateId }, data: { active } });
    await recordAudit(
      {
        actorId: actor.id,
        action: active ? "checklist.template.activate" : "checklist.template.deactivate",
        entityType: "ChecklistTemplate",
        entityId: templateId,
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

export interface AddSectionInput {
  templateId: string;
  title: string;
}

export async function addChecklistSection(actor: Actor, input: AddSectionInput, context: RequestContext) {
  assertAuthorized(actor, "checklist.manage");

  if (!input.title.trim()) {
    throw new ChecklistServiceError("Informe o título da seção.");
  }

  const lastSection = await prisma.checklistSection.findFirst({
    where: { templateId: input.templateId },
    orderBy: { order: "desc" },
  });
  const order = (lastSection?.order ?? -1) + 1;

  return prisma.$transaction(async (tx) => {
    const section = await tx.checklistSection.create({
      data: { templateId: input.templateId, title: input.title.trim(), order },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "checklist.section.add",
        entityType: "ChecklistTemplate",
        entityId: input.templateId,
        after: { sectionId: section.id, title: section.title },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
    return section;
  });
}

export interface AddItemInput {
  sectionId: string;
  templateId: string; // só para auditoria/revalidação de rota
  text: string;
  guidance?: string;
  allowedResponses: InspectionResponse[];
  evidenceRequiredOn: InspectionResponse[];
  observationRequiredOn: InspectionResponse[];
  generatesNonConformity: boolean;
  defaultSeverity?: Criticality;
}

export async function addChecklistItem(actor: Actor, input: AddItemInput, context: RequestContext) {
  assertAuthorized(actor, "checklist.manage");

  if (!input.text.trim()) {
    throw new ChecklistServiceError("Informe o texto do item.");
  }
  if (input.allowedResponses.length === 0) {
    throw new ChecklistServiceError("Selecione ao menos uma resposta permitida para o item.");
  }

  const lastItem = await prisma.checklistItem.findFirst({
    where: { sectionId: input.sectionId },
    orderBy: { order: "desc" },
  });
  const order = (lastItem?.order ?? -1) + 1;

  return prisma.$transaction(async (tx) => {
    const item = await tx.checklistItem.create({
      data: {
        sectionId: input.sectionId,
        order,
        text: input.text.trim(),
        guidance: input.guidance?.trim() || null,
        allowedResponses: input.allowedResponses,
        evidenceRequiredOn: input.evidenceRequiredOn,
        observationRequiredOn: input.observationRequiredOn,
        generatesNonConformity: input.generatesNonConformity,
        defaultSeverity: input.generatesNonConformity ? input.defaultSeverity ?? null : null,
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "checklist.item.add",
        entityType: "ChecklistTemplate",
        entityId: input.templateId,
        after: { itemId: item.id, text: item.text },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
    return item;
  });
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export async function listChecklistTemplates(actor: Actor, includeInactive = false) {
  assertAuthorized(actor, "checklist.view");

  return prisma.checklistTemplate.findMany({
    where: includeInactive ? {} : { active: true },
    include: { category: true, sections: { select: { id: true } } },
    orderBy: { title: "asc" },
  });
}

export async function getChecklistTemplateDetail(actor: Actor, templateId: string) {
  assertAuthorized(actor, "checklist.view");

  return prisma.checklistTemplate.findUnique({
    where: { id: templateId },
    include: {
      category: true,
      sections: {
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      },
    },
  });
}
