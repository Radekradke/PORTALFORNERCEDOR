"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  createChecklistTemplate,
  addChecklistSection,
  addChecklistItem,
  setChecklistTemplateActive,
  ChecklistServiceError,
} from "../services/checklist-service";

function requestContext() {
  const headerList = headers();
  return {
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerList.get("user-agent"),
  };
}

export interface ActionState {
  error?: string;
  success?: boolean;
}

function handleKnownErrors(err: unknown): ActionState {
  if (err instanceof ChecklistServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

const createTemplateSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do checklist."),
  description: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
});

export async function createChecklistTemplateAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTemplateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let templateId: string;
  try {
    const actor = await requireActor();
    const template = await createChecklistTemplate(actor, parsed.data, requestContext());
    templateId = template.id;
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/checklists");
  redirect(`/checklists/${templateId}`);
}

const addSectionSchema = z.object({
  templateId: z.string().min(1),
  title: z.string().trim().min(2, "Informe o título da seção."),
});

export async function addChecklistSectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addSectionSchema.safeParse({
    templateId: formData.get("templateId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await addChecklistSection(actor, parsed.data, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/checklists/${parsed.data.templateId}`);
  return { success: true };
}

const RESPONSE_VALUES = ["CONFORME", "CONFORME_COM_RESSALVA", "NAO_CONFORME", "NAO_APLICAVEL"] as const;

const addItemSchema = z.object({
  sectionId: z.string().min(1),
  templateId: z.string().min(1),
  text: z.string().trim().min(2, "Informe o texto do item."),
  guidance: z.string().trim().optional(),
  allowedResponses: z.array(z.enum(RESPONSE_VALUES)).min(1, "Selecione ao menos uma resposta permitida."),
  evidenceRequiredOn: z.array(z.enum(RESPONSE_VALUES)).optional(),
  observationRequiredOn: z.array(z.enum(RESPONSE_VALUES)).optional(),
  generatesNonConformity: z.string().optional(),
  defaultSeverity: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]).optional(),
});

export async function addChecklistItemAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addItemSchema.safeParse({
    sectionId: formData.get("sectionId"),
    templateId: formData.get("templateId"),
    text: formData.get("text"),
    guidance: formData.get("guidance") || undefined,
    allowedResponses: formData.getAll("allowedResponses"),
    evidenceRequiredOn: formData.getAll("evidenceRequiredOn"),
    observationRequiredOn: formData.getAll("observationRequiredOn"),
    generatesNonConformity: formData.get("generatesNonConformity") || undefined,
    defaultSeverity: formData.get("defaultSeverity") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await addChecklistItem(
      actor,
      {
        sectionId: parsed.data.sectionId,
        templateId: parsed.data.templateId,
        text: parsed.data.text,
        guidance: parsed.data.guidance,
        allowedResponses: parsed.data.allowedResponses,
        evidenceRequiredOn: parsed.data.evidenceRequiredOn ?? [],
        observationRequiredOn: parsed.data.observationRequiredOn ?? [],
        generatesNonConformity: parsed.data.generatesNonConformity === "on",
        defaultSeverity: parsed.data.defaultSeverity,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/checklists/${parsed.data.templateId}`);
  return { success: true };
}

const setActiveSchema = z.object({ templateId: z.string().min(1), active: z.string() });

export async function setChecklistTemplateActiveAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setActiveSchema.safeParse({
    templateId: formData.get("templateId"),
    active: formData.get("active"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await setChecklistTemplateActive(actor, parsed.data.templateId, parsed.data.active === "true", requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/checklists");
  revalidatePath(`/checklists/${parsed.data.templateId}`);
  return { success: true };
}
