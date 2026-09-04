"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  createRequirementType,
  setRequirementTypeActive,
  RequirementTypeServiceError,
} from "../services/requirement-type-service";
import {
  createRequirementRule,
  setRequirementRuleActive,
  RequirementRuleServiceError,
} from "../services/requirement-rule-service";
import { applyRequirementMatrix } from "../services/apply-matrix-service";

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
  if (err instanceof RequirementTypeServiceError || err instanceof RequirementRuleServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

const typeSchema = z.object({
  code: z.string().trim().min(1, "Informe o código."),
  name: z.string().trim().min(2, "Informe o nome."),
  description: z.string().trim().optional(),
  allowedFormats: z.array(z.enum(["PDF", "JPG", "PNG"])).optional(),
  validityType: z.enum(["FIXA", "INFORMADA", "SEM_VENCIMENTO"]),
  validityDays: z.coerce.number().int().positive().optional(),
  needsIssueDate: z.string().optional(),
});

export async function createRequirementTypeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = typeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    allowedFormats: formData.getAll("allowedFormats"),
    validityType: formData.get("validityType"),
    validityDays: formData.get("validityDays") || undefined,
    needsIssueDate: formData.get("needsIssueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await createRequirementType(
      actor,
      { ...parsed.data, needsIssueDate: parsed.data.needsIssueDate === "on" },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/requisitos");
  return { success: true };
}

const toggleTypeSchema = z.object({ id: z.string().min(1), active: z.string() });

export async function toggleRequirementTypeActiveAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = toggleTypeSchema.safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await setRequirementTypeActive(actor, parsed.data.id, parsed.data.active === "true", requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/requisitos");
  return { success: true };
}

const ruleSchema = z.object({
  requirementTypeId: z.string().min(1, "Selecione o tipo de documento."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  criticalities: z.array(z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"])).min(1, "Selecione ao menos uma criticidade."),
  obligation: z.enum(["OBRIGATORIO", "CONDICIONAL", "INFORMATIVO"]),
});

export async function createRequirementRuleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ruleSchema.safeParse({
    requirementTypeId: formData.get("requirementTypeId"),
    categoryId: formData.get("categoryId"),
    criticalities: formData.getAll("criticalities"),
    obligation: formData.get("obligation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await createRequirementRule(actor, parsed.data, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/requisitos");
  return { success: true };
}

const toggleRuleSchema = z.object({ id: z.string().min(1), active: z.string() });

export async function toggleRequirementRuleActiveAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = toggleRuleSchema.safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await setRequirementRuleActive(actor, parsed.data.id, parsed.data.active === "true", requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/requisitos");
  return { success: true };
}

const applyMatrixSchema = z.object({ supplierId: z.string().min(1) });

export async function applyMatrixAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = applyMatrixSchema.safeParse({ supplierId: formData.get("supplierId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await applyRequirementMatrix(actor, parsed.data.supplierId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}
