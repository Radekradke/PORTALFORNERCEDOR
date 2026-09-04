"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  uploadDocumentVersion,
  startDocumentReview,
  approveDocumentVersion,
  rejectDocumentVersion,
  DocumentServiceError,
} from "../services/document-service";

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
  if (err instanceof DocumentServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

const uploadSchema = z.object({
  supplierRequirementId: z.string().min(1),
  documentNumber: z.string().trim().optional(),
  issuer: z.string().trim().optional(),
  issuedAt: z.string().optional(),
  validUntil: z.string().optional(),
  submitterNote: z.string().trim().optional(),
});

export async function uploadDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo para enviar." };
  }

  const parsed = uploadSchema.safeParse({
    supplierRequirementId: formData.get("supplierRequirementId"),
    documentNumber: formData.get("documentNumber") || undefined,
    issuer: formData.get("issuer") || undefined,
    issuedAt: formData.get("issuedAt") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    submitterNote: formData.get("submitterNote") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const actor = await requireActor();
    await uploadDocumentVersion(
      actor,
      {
        supplierRequirementId: parsed.data.supplierRequirementId,
        file: buffer,
        originalName: file.name,
        documentNumber: parsed.data.documentNumber,
        issuer: parsed.data.issuer,
        issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : undefined,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
        submitterNote: parsed.data.submitterNote,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/portal-fornecedor/documentos");
  revalidatePath("/documentos");
  return { success: true };
}

const versionIdSchema = z.object({ versionId: z.string().min(1) });

export async function startReviewAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = versionIdSchema.safeParse({ versionId: formData.get("versionId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await startDocumentReview(actor, parsed.data.versionId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${parsed.data.versionId}`);
  return { success: true };
}

const approveSchema = z.object({
  versionId: z.string().min(1),
  validUntilOverride: z.string().optional(),
  reason: z.string().trim().optional(),
});

export async function approveDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = approveSchema.safeParse({
    versionId: formData.get("versionId"),
    validUntilOverride: formData.get("validUntilOverride") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await approveDocumentVersion(
      actor,
      {
        versionId: parsed.data.versionId,
        validUntilOverride: parsed.data.validUntilOverride ? new Date(parsed.data.validUntilOverride) : undefined,
        reason: parsed.data.reason,
      },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${parsed.data.versionId}`);
  revalidatePath("/portal-fornecedor/documentos");
  return { success: true };
}

const rejectSchema = z.object({
  versionId: z.string().min(1),
  reason: z.string().trim().min(3, "Informe o motivo da rejeição."),
  internalNote: z.string().trim().optional(),
});

export async function rejectDocumentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = rejectSchema.safeParse({
    versionId: formData.get("versionId"),
    reason: formData.get("reason"),
    internalNote: formData.get("internalNote") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await rejectDocumentVersion(actor, parsed.data, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${parsed.data.versionId}`);
  revalidatePath("/portal-fornecedor/documentos");
  return { success: true };
}
