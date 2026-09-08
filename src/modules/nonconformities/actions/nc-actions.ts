"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  createNonConformity,
  updateNonConformityDraft,
  openNonConformity,
  saveActionPlan,
  decideActionPlan,
  addCorrectionEvidence,
  submitForVerification,
  verifyCorrection,
  reopenNonConformity,
  NonConformityServiceError,
} from "../services/nc-service";

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
  if (err instanceof NonConformityServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

function revalidateNcPaths(ncId: string) {
  revalidatePath(`/nao-conformidades/${ncId}`);
  revalidatePath("/nao-conformidades");
  revalidatePath(`/portal-fornecedor/nao-conformidades/${ncId}`);
  revalidatePath("/portal-fornecedor/nao-conformidades");
}

const CRITICALITY_VALUES = ["BAIXA", "MEDIA", "ALTA", "CRITICA"] as const;

const createSchema = z.object({
  supplierId: z.string().min(1, "Selecione o fornecedor."),
  categoryId: z.string().trim().optional(),
  severity: z.enum(CRITICALITY_VALUES, { errorMap: () => ({ message: "Selecione a gravidade." }) }),
  description: z.string().trim().min(3, "Descreva a não conformidade."),
  responsibleInternalId: z.string().min(1, "Selecione o responsável interno."),
  deadline: z.string().optional(),
});

export async function createNonConformityAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    supplierId: formData.get("supplierId"),
    categoryId: formData.get("categoryId") || undefined,
    severity: formData.get("severity"),
    description: formData.get("description"),
    responsibleInternalId: formData.get("responsibleInternalId"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let ncId: string;
  try {
    const actor = await requireActor();
    const nc = await createNonConformity(
      actor,
      { ...parsed.data, deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined },
      requestContext(),
    );
    ncId = nc.id;
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/nao-conformidades");
  redirect(`/nao-conformidades/${ncId}`);
}

const draftUpdateSchema = z.object({
  ncId: z.string().min(1),
  categoryId: z.string().trim().optional(),
  severity: z.enum(CRITICALITY_VALUES).optional(),
  description: z.string().trim().optional(),
  responsibleInternalId: z.string().trim().optional(),
  deadline: z.string().optional(),
});

export async function updateNonConformityDraftAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = draftUpdateSchema.safeParse({
    ncId: formData.get("ncId"),
    categoryId: formData.get("categoryId") || undefined,
    severity: formData.get("severity") || undefined,
    description: formData.get("description") || undefined,
    responsibleInternalId: formData.get("responsibleInternalId") || undefined,
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await updateNonConformityDraft(
      actor,
      parsed.data.ncId,
      {
        categoryId: parsed.data.categoryId,
        severity: parsed.data.severity,
        description: parsed.data.description,
        responsibleInternalId: parsed.data.responsibleInternalId,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

const ncIdSchema = z.object({ ncId: z.string().min(1) });

export async function openNonConformityAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ncIdSchema.safeParse({ ncId: formData.get("ncId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await openNonConformity(actor, parsed.data.ncId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

const savePlanSchema = z.object({
  ncId: z.string().min(1),
  cause: z.string().trim().optional(),
  correctiveAction: z.string().trim().optional(),
  responsibleName: z.string().trim().optional(),
  proposedDeadline: z.string().optional(),
});

/**
 * Um único formulário, dois botões (`<button name="intent" value="draft|submit">`)
 * — evita duplicar os campos do plano em dois `<form>` separados.
 */
export async function saveActionPlanAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = savePlanSchema.safeParse({
    ncId: formData.get("ncId"),
    cause: formData.get("cause") || undefined,
    correctiveAction: formData.get("correctiveAction") || undefined,
    responsibleName: formData.get("responsibleName") || undefined,
    proposedDeadline: formData.get("proposedDeadline") || undefined,
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  const submit = formData.get("intent") === "submit";

  try {
    const actor = await requireActor();
    await saveActionPlan(
      actor,
      parsed.data.ncId,
      {
        cause: parsed.data.cause,
        correctiveAction: parsed.data.correctiveAction,
        responsibleName: parsed.data.responsibleName,
        proposedDeadline: parsed.data.proposedDeadline ? new Date(parsed.data.proposedDeadline) : undefined,
        submit,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

const decidePlanSchema = z.object({
  ncId: z.string().min(1),
  decision: z.enum(["ACEITO", "REJEITADO", "AJUSTES_SOLICITADOS"], {
    errorMap: () => ({ message: "Selecione a decisão." }),
  }),
  reason: z.string().trim().optional(),
});

export async function decideActionPlanAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = decidePlanSchema.safeParse({
    ncId: formData.get("ncId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await decideActionPlan(actor, parsed.data, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

export async function addCorrectionEvidenceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ncIdSchema.safeParse({ ncId: formData.get("ncId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo para enviar." };
  }
  const description = (formData.get("description") as string | null) ?? undefined;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const actor = await requireActor();
    await addCorrectionEvidence(
      actor,
      parsed.data.ncId,
      { file: { buffer, originalName: file.name }, description },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

export async function submitForVerificationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ncIdSchema.safeParse({ ncId: formData.get("ncId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await submitForVerification(actor, parsed.data.ncId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

const verifySchema = z.object({
  ncId: z.string().min(1),
  method: z.enum(["REMOTA", "PRESENCIAL"], { errorMap: () => ({ message: "Selecione o método de verificação." }) }),
  decision: z.enum(["APROVADA", "REJEITADA"], { errorMap: () => ({ message: "Selecione a decisão." }) }),
  note: z.string().trim().optional(),
});

export async function verifyCorrectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = verifySchema.safeParse({
    ncId: formData.get("ncId"),
    method: formData.get("method"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await verifyCorrection(actor, parsed.data, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}

const reopenSchema = z.object({
  ncId: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo da reabertura."),
  newDeadline: z.string().min(1, "Informe o novo prazo."),
  targetStatus: z.enum(["AGUARDANDO_PLANO", "EM_CORRECAO", "AGUARDANDO_VERIFICACAO"], {
    errorMap: () => ({ message: "Selecione para qual etapa a NC volta." }),
  }),
});

export async function reopenNonConformityAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reopenSchema.safeParse({
    ncId: formData.get("ncId"),
    reason: formData.get("reason"),
    newDeadline: formData.get("newDeadline"),
    targetStatus: formData.get("targetStatus"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await reopenNonConformity(
      actor,
      { ...parsed.data, newDeadline: new Date(parsed.data.newDeadline) },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateNcPaths(parsed.data.ncId);
  return { success: true };
}
