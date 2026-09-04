"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import { decideQualification, startRequalification, QualificationServiceError } from "../services/qualification-service";

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
  if (err instanceof QualificationServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

function revalidateQualificationPaths(supplierId: string) {
  revalidatePath(`/fornecedores/${supplierId}`);
  revalidatePath("/fornecedores");
  revalidatePath("/portal-fornecedor/qualificacao");
  revalidatePath("/portal-fornecedor");
}

const decideSchema = z.object({
  qualificationId: z.string().min(1),
  supplierId: z.string().min(1),
  result: z.enum(["APROVADO", "APROVADO_COM_RESSALVAS", "REPROVADO"], {
    errorMap: () => ({ message: "Selecione o resultado da decisão." }),
  }),
  reason: z.string().trim().min(3, "Informe a justificativa da decisão."),
  conditionText: z.string().trim().optional(),
  conditionResponsible: z.string().trim().optional(),
  conditionDeadline: z.string().optional(),
  conditionEffect: z.string().trim().optional(),
});

export async function decideQualificationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = decideSchema.safeParse({
    qualificationId: formData.get("qualificationId"),
    supplierId: formData.get("supplierId"),
    result: formData.get("result"),
    reason: formData.get("reason"),
    conditionText: formData.get("conditionText") || undefined,
    conditionResponsible: formData.get("conditionResponsible") || undefined,
    conditionDeadline: formData.get("conditionDeadline") || undefined,
    conditionEffect: formData.get("conditionEffect") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await decideQualification(
      actor,
      {
        qualificationId: parsed.data.qualificationId,
        result: parsed.data.result,
        reason: parsed.data.reason,
        conditionText: parsed.data.conditionText,
        conditionResponsible: parsed.data.conditionResponsible,
        conditionDeadline: parsed.data.conditionDeadline ? new Date(parsed.data.conditionDeadline) : undefined,
        conditionEffect: parsed.data.conditionEffect,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateQualificationPaths(parsed.data.supplierId);
  return { success: true };
}

const requalifySchema = z.object({
  supplierId: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo da nova rodada."),
});

export async function startRequalificationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = requalifySchema.safeParse({
    supplierId: formData.get("supplierId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Informe o motivo." };

  try {
    const actor = await requireActor();
    await startRequalification(actor, parsed.data.supplierId, parsed.data.reason, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidateQualificationPaths(parsed.data.supplierId);
  return { success: true };
}
