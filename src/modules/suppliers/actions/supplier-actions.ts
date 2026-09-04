"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/modules/auth-access/services/current-actor";
import { AuthorizationError } from "@/modules/auth-access/domain/authorize";
import {
  createSupplierInvite,
  updateOwnProfile,
  addSupplierContact,
  deactivateSupplierContact,
  submitForAnalysis,
  startReview,
  validateRegistration,
  requestAdjustments,
  rejectRegistration,
  inactivateSupplier,
  reactivateSupplier,
  suspendSupplier,
  blockSupplier,
  unblockSupplier,
  updateSupplierGovernance,
  addSupplierResponsible,
  removeSupplierResponsible,
  SupplierServiceError,
} from "../services/supplier-service";

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
  if (err instanceof SupplierServiceError || err instanceof AuthorizationError) {
    return { error: err.message };
  }
  throw err;
}

// -----------------------------------------------------------------------------
// Criação / convite
// -----------------------------------------------------------------------------

const createSchema = z.object({
  cnpj: z.string().min(1, "Informe o CNPJ."),
  legalName: z.string().trim().min(2, "Informe a razão social."),
  tradeName: z.string().trim().optional(),
  contactName: z.string().trim().min(2, "Informe o nome do contato principal."),
  contactEmail: z.string().trim().min(1, "Informe o e-mail do contato.").email("E-mail inválido."),
  criticality: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"], {
    errorMap: () => ({ message: "Selecione a criticidade." }),
  }),
  supplyType: z.enum(["MATERIAL", "SERVICO", "AMBOS"]).optional(),
  categoryIds: z.array(z.string()).min(1, "Selecione ao menos uma categoria."),
});

export async function createSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    cnpj: formData.get("cnpj"),
    legalName: formData.get("legalName"),
    tradeName: formData.get("tradeName") || undefined,
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    criticality: formData.get("criticality"),
    supplyType: formData.get("supplyType") || undefined,
    categoryIds: formData.getAll("categoryIds"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let supplierId: string;
  try {
    const actor = await requireActor();
    const supplier = await createSupplierInvite(actor, parsed.data, requestContext());
    supplierId = supplier.id;
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/fornecedores");
  redirect(`/fornecedores/${supplierId}`);
}

// -----------------------------------------------------------------------------
// Perfil (edição pelo próprio fornecedor)
// -----------------------------------------------------------------------------

const profileSchema = z.object({
  supplierId: z.string().min(1),
  legalName: z.string().trim().optional(),
  tradeName: z.string().trim().optional(),
  stateRegistration: z.string().trim().optional(),
  municipalRegistration: z.string().trim().optional(),
  website: z.string().trim().optional(),
  companySize: z.string().trim().optional(),
  registeredStatusInformed: z.string().trim().optional(),
  addressZip: z.string().trim().optional(),
  addressStreet: z.string().trim().optional(),
  addressNumber: z.string().trim().optional(),
  addressComplement: z.string().trim().optional(),
  addressDistrict: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().optional(),
});

export async function updateOwnProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supplierId, ...input } = parsed.data;

  try {
    const actor = await requireActor();
    await updateOwnProfile(actor, supplierId, input, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/portal-fornecedor/empresa");
  revalidatePath(`/fornecedores/${supplierId}`);
  return { success: true };
}

const submitSchema = z.object({ supplierId: z.string().min(1) });

export async function submitForAnalysisAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = submitSchema.safeParse({ supplierId: formData.get("supplierId") });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await submitForAnalysis(actor, parsed.data.supplierId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/portal-fornecedor");
  revalidatePath("/portal-fornecedor/empresa");
  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}

// -----------------------------------------------------------------------------
// Contatos
// -----------------------------------------------------------------------------

const contactSchema = z.object({
  supplierId: z.string().min(1),
  name: z.string().trim().min(2, "Informe o nome do contato."),
  role: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  contactType: z.enum(["COMERCIAL", "FINANCEIRO", "TECNICO", "QSMS", "OUTRO"]),
  isPrimary: z.string().optional(),
});

export async function addContactAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    supplierId: formData.get("supplierId"),
    name: formData.get("name"),
    role: formData.get("role") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    contactType: formData.get("contactType"),
    isPrimary: formData.get("isPrimary") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const actor = await requireActor();
    await addSupplierContact(
      actor,
      parsed.data.supplierId,
      { ...parsed.data, isPrimary: parsed.data.isPrimary === "on" },
      requestContext(),
    );
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/portal-fornecedor/empresa");
  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}

const contactIdSchema = z.object({ supplierId: z.string().min(1), contactId: z.string().min(1) });

export async function deactivateContactAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactIdSchema.safeParse({
    supplierId: formData.get("supplierId"),
    contactId: formData.get("contactId"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await deactivateSupplierContact(actor, parsed.data.supplierId, parsed.data.contactId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath("/portal-fornecedor/empresa");
  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}

// -----------------------------------------------------------------------------
// Revisão cadastral (Compras)
// -----------------------------------------------------------------------------

const reviewSchema = z.object({
  supplierId: z.string().min(1),
  reason: z.string().trim().optional(),
});

async function runReviewAction(
  fn: (actor: Awaited<ReturnType<typeof requireActor>>, id: string, reason: string, ctx: ReturnType<typeof requestContext>) => Promise<void>,
  formData: FormData,
  requireReason: boolean,
): Promise<ActionState> {
  const parsed = reviewSchema.safeParse({
    supplierId: formData.get("supplierId"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Dados inválidos." };
  if (requireReason && !parsed.data.reason) return { error: "Informe o motivo." };

  try {
    const actor = await requireActor();
    await fn(actor, parsed.data.supplierId, parsed.data.reason ?? "", requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  revalidatePath("/fornecedores");
  return { success: true };
}

export async function startReviewAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reviewSchema.safeParse({ supplierId: formData.get("supplierId") });
  if (!parsed.success) return { error: "Dados inválidos." };
  try {
    const actor = await requireActor();
    await startReview(actor, parsed.data.supplierId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }
  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}

export async function validateRegistrationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runReviewAction(validateRegistration, formData, false);
}

export async function requestAdjustmentsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runReviewAction(requestAdjustments, formData, true);
}

export async function rejectRegistrationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runReviewAction(rejectRegistration, formData, true);
}

export async function inactivateAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return runReviewAction(inactivateSupplier, formData, true);
}

export async function reactivateAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return runReviewAction(reactivateSupplier, formData, true);
}

// -----------------------------------------------------------------------------
// Situação operacional (permissões sensíveis)
// -----------------------------------------------------------------------------

export async function suspendAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return runReviewAction(suspendSupplier, formData, true);
}

export async function blockAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return runReviewAction(blockSupplier, formData, true);
}

export async function unblockAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  return runReviewAction(unblockSupplier, formData, true);
}

// -----------------------------------------------------------------------------
// Governança (categoria/criticidade) e responsáveis
// -----------------------------------------------------------------------------

const governanceSchema = z.object({
  supplierId: z.string().min(1),
  criticality: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  supplyType: z.enum(["MATERIAL", "SERVICO", "AMBOS"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  reason: z.string().trim().optional(),
});

export async function updateGovernanceAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = governanceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    criticality: formData.get("criticality") || undefined,
    supplyType: formData.get("supplyType") || undefined,
    categoryIds: formData.getAll("categoryIds"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { supplierId, ...input } = parsed.data;

  try {
    const actor = await requireActor();
    await updateSupplierGovernance(actor, supplierId, input, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fornecedores/${supplierId}`);
  return { success: true };
}

const responsibleSchema = z.object({
  supplierId: z.string().min(1),
  userId: z.string().min(1),
  type: z.enum(["COMPRADOR", "GESTOR_CONTRATO", "FISCAL"]),
});

export async function addResponsibleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = responsibleSchema.safeParse({
    supplierId: formData.get("supplierId"),
    userId: formData.get("userId"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const actor = await requireActor();
    await addSupplierResponsible(actor, parsed.data.supplierId, parsed.data.userId, parsed.data.type, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}

const removeResponsibleSchema = z.object({ supplierId: z.string().min(1), responsibleId: z.string().min(1) });

export async function removeResponsibleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = removeResponsibleSchema.safeParse({
    supplierId: formData.get("supplierId"),
    responsibleId: formData.get("responsibleId"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const actor = await requireActor();
    await removeSupplierResponsible(actor, parsed.data.supplierId, parsed.data.responsibleId, requestContext());
  } catch (err) {
    return handleKnownErrors(err);
  }

  revalidatePath(`/fornecedores/${parsed.data.supplierId}`);
  return { success: true };
}
