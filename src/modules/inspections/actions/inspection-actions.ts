"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  scheduleInspection,
  saveAnswer,
  concludeInspection,
  cancelInspection,
  InspectionServiceError,
} from "../services/inspection-service";

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
  if (err instanceof InspectionServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

const scheduleSchema = z.object({
  supplierId: z.string().min(1, "Selecione o fornecedor."),
  templateId: z.string().min(1, "Selecione o checklist."),
  inspectorId: z.string().min(1, "Selecione o fiscal responsável."),
  scheduledAt: z.string().min(1, "Informe a data e hora."),
  projectOrLocation: z.string().trim().optional(),
  type: z.string().trim().optional(),
});

export async function scheduleInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = scheduleSchema.safeParse({
    supplierId: formData.get("supplierId"),
    templateId: formData.get("templateId"),
    inspectorId: formData.get("inspectorId"),
    scheduledAt: formData.get("scheduledAt"),
    projectOrLocation: formData.get("projectOrLocation") || undefined,
    type: formData.get("type") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Data/hora inválida." };

  let inspectionId: string;
  try {
    const actor = await requireActor();
    const inspection = await scheduleInspection(
      actor,
      { ...parsed.data, scheduledAt },
      requestContext(),
    );
    inspectionId = inspection.id;
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/fiscalizacoes");
  redirect(`/fiscalizacoes/${inspectionId}`);
}

const RESPONSE_VALUES = ["CONFORME", "CONFORME_COM_RESSALVA", "NAO_CONFORME", "NAO_APLICAVEL"] as const;

const saveAnswerSchema = z.object({
  inspectionId: z.string().min(1),
  itemId: z.string().min(1),
  response: z.enum(RESPONSE_VALUES).optional(),
  observation: z.string().trim().optional(),
});

export async function saveAnswerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = saveAnswerSchema.safeParse({
    inspectionId: formData.get("inspectionId"),
    itemId: formData.get("itemId"),
    response: formData.get("response") || undefined,
    observation: formData.get("observation") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const file = formData.get("file");
  const fileInput = file instanceof File && file.size > 0 ? { buffer: Buffer.from(await file.arrayBuffer()), originalName: file.name } : undefined;

  try {
    const actor = await requireActor();
    await saveAnswer(
      actor,
      {
        inspectionId: parsed.data.inspectionId,
        itemId: parsed.data.itemId,
        response: parsed.data.response,
        observation: parsed.data.observation,
        file: fileInput,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fiscalizacoes/${parsed.data.inspectionId}`);
  return { success: true };
}

const inspectionIdSchema = z.object({ inspectionId: z.string().min(1) });

export async function concludeInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inspectionIdSchema.safeParse({ inspectionId: formData.get("inspectionId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await concludeInspection(actor, parsed.data.inspectionId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fiscalizacoes/${parsed.data.inspectionId}`);
  revalidatePath("/fiscalizacoes");
  revalidatePath("/portal-fornecedor/fiscalizacoes");
  return { success: true };
}

const cancelSchema = z.object({
  inspectionId: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo do cancelamento."),
});

export async function cancelInspectionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cancelSchema.safeParse({
    inspectionId: formData.get("inspectionId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await cancelInspection(actor, parsed.data.inspectionId, parsed.data.reason, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fiscalizacoes/${parsed.data.inspectionId}`);
  revalidatePath("/fiscalizacoes");
  return { success: true };
}
