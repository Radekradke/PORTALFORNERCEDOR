import type { Criticality, Prisma, SupplierResponsibleType, SupplyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeCnpj, isValidCnpj } from "@/lib/cnpj";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { requestPasswordReset } from "@/modules/auth-access/services/password-reset-service";

export class SupplierServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

// -----------------------------------------------------------------------------
// Criação / convite (RF-016, fluxo 6.1)
// -----------------------------------------------------------------------------

export interface CreateSupplierInviteInput {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  contactName: string;
  contactEmail: string;
  criticality: Criticality;
  supplyType?: SupplyType;
  categoryIds: string[];
}

export async function createSupplierInvite(
  actor: Actor,
  input: CreateSupplierInviteInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.create");

  const cnpj = normalizeCnpj(input.cnpj);
  if (!isValidCnpj(cnpj)) {
    throw new SupplierServiceError("CNPJ inválido. Confira os dígitos informados.");
  }

  if (input.categoryIds.length === 0) {
    throw new SupplierServiceError("Selecione ao menos uma categoria.");
  }

  // RN-001 / RF-011 / CA-01: impedir CNPJ duplicado, oferecendo abrir o existente.
  const existing = await prisma.supplier.findUnique({ where: { cnpj }, select: { id: true } });
  if (existing) {
    throw new SupplierServiceError(
      `Já existe um fornecedor cadastrado com este CNPJ (${existing.id}). Abra o cadastro existente em vez de criar um novo.`,
    );
  }

  const email = input.contactEmail.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new SupplierServiceError("Já existe um usuário cadastrado com este e-mail de contato.");
  }

  const supplier = await prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({
      data: {
        cnpj,
        legalName: input.legalName.trim(),
        tradeName: input.tradeName?.trim() || null,
        criticality: input.criticality,
        supplyType: input.supplyType ?? null,
        registrationStatus: "CONVITE_ENVIADO",
        inviteSentAt: new Date(),
        categories: {
          create: input.categoryIds.map((categoryId) => ({ categoryId })),
        },
        contacts: {
          create: [
            {
              name: input.contactName.trim(),
              email,
              contactType: "COMERCIAL",
              isPrimary: true,
            },
          ],
        },
      },
    });

    const externalUser = await tx.user.create({
      data: {
        name: input.contactName.trim(),
        email,
        role: "FORNECEDOR_ADMIN",
        status: "INVITED",
        supplierId: created.id,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.create",
        entityType: "Supplier",
        entityId: created.id,
        supplierId: created.id,
        after: {
          cnpj,
          legalName: created.legalName,
          criticality: created.criticality,
          categoryIds: input.categoryIds,
        },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );

    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.invite.sent",
        entityType: "Supplier",
        entityId: created.id,
        supplierId: created.id,
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );

    return { ...created, externalUserEmail: externalUser.email };
  });

  // Fora da transação: envio de e-mail é I/O externo (mesmo padrão de createInternalUser).
  await requestPasswordReset(supplier.externalUserEmail, context, "invite");

  return supplier;
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------

export interface ListSuppliersFilters {
  search?: string;
  registrationStatus?: string;
  operationalStatus?: string;
  criticality?: string;
  page?: number;
  pageSize?: number;
}

export async function listSuppliers(actor: Actor, filters: ListSuppliersFilters = {}) {
  assertAuthorized(actor, "supplier.view");

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;

  const where: Prisma.SupplierWhereInput = {
    ...(filters.registrationStatus ? { registrationStatus: filters.registrationStatus as never } : {}),
    ...(filters.operationalStatus ? { operationalStatus: filters.operationalStatus as never } : {}),
    ...(filters.criticality ? { criticality: filters.criticality as never } : {}),
    ...(filters.search
      ? {
          OR: [
            { legalName: { contains: filters.search, mode: "insensitive" } },
            { tradeName: { contains: filters.search, mode: "insensitive" } },
            { cnpj: { contains: normalizeCnpj(filters.search) } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        categories: { include: { category: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function getSupplierById(actor: Actor, id: string) {
  assertAuthorized(actor, "supplier.view", { supplierId: id });

  return prisma.supplier.findUnique({
    where: { id },
    include: {
      contacts: { where: { active: true }, orderBy: { isPrimary: "desc" } },
      categories: { include: { category: true } },
      responsibles: {
        where: { active: true },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      users: { select: { id: true, name: true, email: true, role: true, status: true } },
    },
  });
}

// -----------------------------------------------------------------------------
// Edição pelo próprio fornecedor (RF-131, EXT-03)
// -----------------------------------------------------------------------------

export interface UpdateOwnProfileInput {
  legalName?: string;
  tradeName?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  website?: string;
  companySize?: string;
  registeredStatusInformed?: string;
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
}

export async function updateOwnProfile(
  actor: Actor,
  supplierId: string,
  input: UpdateOwnProfileInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.own", { supplierId });

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  // RF-131 fala em "campos liberados" vs. "mudanças sensíveis que retornam
  // para análise", sem definir quais campos são sensíveis (não é decisão de
  // negócio tomada ainda — ver D-XX em docs/DECISOES_PENDENTES.md). Para não
  // inventar essa taxonomia, a simplificação desta fatia é: só é possível
  // editar enquanto o cadastro está em preenchimento/ajustes. Cadastro em
  // análise ou já validado exige falar com Compras para reabrir.
  const EDITABLE_STATUSES = ["CONVITE_ENVIADO", "EM_PREENCHIMENTO", "AJUSTES_SOLICITADOS"];
  if (!EDITABLE_STATUSES.includes(supplier.registrationStatus)) {
    throw new SupplierServiceError(
      "O cadastro não pode ser editado neste momento. Contate Suprimentos/Compras se precisar corrigir algo.",
    );
  }

  const nextStatus =
    supplier.registrationStatus === "CONVITE_ENVIADO" ? "EM_PREENCHIMENTO" : supplier.registrationStatus;

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        legalName: input.legalName?.trim() || supplier.legalName,
        tradeName: input.tradeName?.trim() ?? supplier.tradeName,
        stateRegistration: input.stateRegistration?.trim() ?? supplier.stateRegistration,
        municipalRegistration: input.municipalRegistration?.trim() ?? supplier.municipalRegistration,
        website: input.website?.trim() ?? supplier.website,
        companySize: input.companySize?.trim() ?? supplier.companySize,
        registeredStatusInformed: input.registeredStatusInformed?.trim() ?? supplier.registeredStatusInformed,
        addressZip: input.addressZip?.trim() ?? supplier.addressZip,
        addressStreet: input.addressStreet?.trim() ?? supplier.addressStreet,
        addressNumber: input.addressNumber?.trim() ?? supplier.addressNumber,
        addressComplement: input.addressComplement?.trim() ?? supplier.addressComplement,
        addressDistrict: input.addressDistrict?.trim() ?? supplier.addressDistrict,
        addressCity: input.addressCity?.trim() ?? supplier.addressCity,
        addressState: input.addressState?.trim() ?? supplier.addressState,
        registrationStatus: nextStatus,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.profile.update",
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Contatos (RF-012)
// -----------------------------------------------------------------------------

export interface AddContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  contactType: "COMERCIAL" | "FINANCEIRO" | "TECNICO" | "QSMS" | "OUTRO";
  isPrimary: boolean;
}

export async function addSupplierContact(
  actor: Actor,
  supplierId: string,
  input: AddContactInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.own", { supplierId });

  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.supplierContact.updateMany({
        where: { supplierId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await tx.supplierContact.create({
      data: {
        supplierId,
        name: input.name.trim(),
        role: input.role?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        contactType: input.contactType,
        isPrimary: input.isPrimary,
      },
    });

    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.contact.add",
        entityType: "SupplierContact",
        entityId: contact.id,
        supplierId,
        after: { name: contact.name, contactType: contact.contactType },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

export async function deactivateSupplierContact(
  actor: Actor,
  supplierId: string,
  contactId: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.own", { supplierId });

  const contact = await prisma.supplierContact.findFirst({ where: { id: contactId, supplierId } });
  if (!contact) throw new SupplierServiceError("Contato não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.supplierContact.update({ where: { id: contactId }, data: { active: false } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.contact.deactivate",
        entityType: "SupplierContact",
        entityId: contactId,
        supplierId,
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Fluxo de análise cadastral (RF-018, RF-019, seção 5.1)
// -----------------------------------------------------------------------------

const MIN_ADDRESS_FIELDS: Array<keyof UpdateOwnProfileInput> = [
  "addressZip",
  "addressStreet",
  "addressCity",
  "addressState",
];

export async function submitForAnalysis(actor: Actor, supplierId: string, context: RequestContext) {
  assertAuthorized(actor, "supplier.submit_for_analysis", { supplierId });

  const supplier = await prisma.supplier.findUniqueOrThrow({
    where: { id: supplierId },
    include: { contacts: { where: { active: true } } },
  });

  if (!["EM_PREENCHIMENTO", "AJUSTES_SOLICITADOS"].includes(supplier.registrationStatus)) {
    throw new SupplierServiceError("Cadastro não está em um estado que permita envio para análise.");
  }

  const missing: string[] = [];
  if (!supplier.legalName) missing.push("razão social");
  for (const field of MIN_ADDRESS_FIELDS) {
    if (!supplier[field]) missing.push("endereço completo");
  }
  if (supplier.contacts.length === 0) missing.push("ao menos um contato");

  if (missing.length > 0) {
    throw new SupplierServiceError(
      `Cadastro incompleto. Preencha: ${Array.from(new Set(missing)).join(", ")}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        registrationStatus: "ENVIADO_PARA_ANALISE",
        submittedAt: supplier.submittedAt ?? new Date(),
      },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.registration.submit",
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        before: { registrationStatus: supplier.registrationStatus },
        after: { registrationStatus: "ENVIADO_PARA_ANALISE" },
        context: auditCtx(context),
        visibility: "externa",
      },
      tx,
    );
  });
}

async function transitionRegistration(
  actor: Actor,
  supplierId: string,
  options: {
    from: string[];
    to: "EM_ANALISE" | "CADASTRO_VALIDADO" | "AJUSTES_SOLICITADOS" | "REJEITADO" | "INATIVO";
    action: string;
    reason?: string;
    requireReason?: boolean;
    context: RequestContext;
    extraData?: Prisma.SupplierUpdateInput;
  },
) {
  if (options.requireReason && !options.reason?.trim()) {
    throw new SupplierServiceError("Informe o motivo desta decisão.");
  }

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  if (!options.from.includes(supplier.registrationStatus)) {
    throw new SupplierServiceError(
      `Ação não permitida no estado atual do cadastro (${supplier.registrationStatus}).`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: { registrationStatus: options.to, ...options.extraData },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: options.action,
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        reason: options.reason?.trim() || null,
        before: { registrationStatus: supplier.registrationStatus },
        after: { registrationStatus: options.to },
        context: auditCtx(options.context),
        visibility: "externa",
      },
      tx,
    );
  });
}

export async function startReview(actor: Actor, supplierId: string, context: RequestContext) {
  assertAuthorized(actor, "supplier.registration.start_review");
  await transitionRegistration(actor, supplierId, {
    from: ["ENVIADO_PARA_ANALISE"],
    to: "EM_ANALISE",
    action: "supplier.registration.review_started",
    context,
  });
}

export async function validateRegistration(
  actor: Actor,
  supplierId: string,
  reason: string | undefined,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.registration.validate");
  await transitionRegistration(actor, supplierId, {
    from: ["ENVIADO_PARA_ANALISE", "EM_ANALISE"],
    to: "CADASTRO_VALIDADO",
    action: "supplier.registration.validate",
    reason,
    context,
    extraData: { validatedAt: new Date() },
  });
}

export async function requestAdjustments(
  actor: Actor,
  supplierId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.registration.request_adjustments");
  await transitionRegistration(actor, supplierId, {
    from: ["ENVIADO_PARA_ANALISE", "EM_ANALISE"],
    to: "AJUSTES_SOLICITADOS",
    action: "supplier.registration.request_adjustments",
    reason,
    requireReason: true,
    context,
  });
}

export async function rejectRegistration(
  actor: Actor,
  supplierId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.registration.reject");
  await transitionRegistration(actor, supplierId, {
    from: ["ENVIADO_PARA_ANALISE", "EM_ANALISE"],
    to: "REJEITADO",
    action: "supplier.registration.reject",
    reason,
    requireReason: true,
    context,
  });
}

export async function inactivateSupplier(
  actor: Actor,
  supplierId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.inactivate");
  await transitionRegistration(actor, supplierId, {
    from: ["CADASTRO_VALIDADO", "EM_ANALISE", "ENVIADO_PARA_ANALISE", "AJUSTES_SOLICITADOS", "REJEITADO"],
    to: "INATIVO",
    action: "supplier.inactivate",
    reason,
    requireReason: true,
    context,
  });
}

export async function reactivateSupplier(
  actor: Actor,
  supplierId: string,
  reason: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.reactivate");
  await transitionRegistration(actor, supplierId, {
    from: ["INATIVO"],
    to: "EM_ANALISE",
    action: "supplier.reactivate",
    reason,
    requireReason: true,
    context,
  });
}

// -----------------------------------------------------------------------------
// Situação operacional (RF-099, seção 6.5) — decisão sempre manual e
// autorizada nesta fatia; cômputo automático fica para F3+ (ver D-07).
// -----------------------------------------------------------------------------

async function changeOperationalStatus(
  actor: Actor,
  supplierId: string,
  options: {
    to: "SUSPENSO" | "BLOQUEADO" | "REGULAR";
    action: string;
    reason: string;
    context: RequestContext;
  },
) {
  if (!options.reason.trim()) {
    throw new SupplierServiceError("Informe o motivo desta decisão.");
  }

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: { operationalStatus: options.to, operationalReason: options.reason.trim() },
    });
    await recordAudit(
      {
        actorId: actor.id,
        action: options.action,
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        reason: options.reason.trim(),
        before: { operationalStatus: supplier.operationalStatus },
        after: { operationalStatus: options.to },
        context: auditCtx(options.context),
        visibility: "externa",
      },
      tx,
    );
  });
}

export async function suspendSupplier(actor: Actor, supplierId: string, reason: string, context: RequestContext) {
  assertAuthorized(actor, "supplier.suspend");
  await changeOperationalStatus(actor, supplierId, {
    to: "SUSPENSO",
    action: "supplier.suspend",
    reason,
    context,
  });
}

export async function blockSupplier(actor: Actor, supplierId: string, reason: string, context: RequestContext) {
  assertAuthorized(actor, "supplier.block");
  await changeOperationalStatus(actor, supplierId, {
    to: "BLOQUEADO",
    action: "supplier.block",
    reason,
    context,
  });
}

export async function unblockSupplier(actor: Actor, supplierId: string, reason: string, context: RequestContext) {
  assertAuthorized(actor, "supplier.unblock");
  // TODO(decisao-negocio): quando o cômputo automático de ATENCAO/IRREGULAR
  // existir (F3+), desbloquear deveria recalcular a situação em vez de
  // sempre voltar para REGULAR. Ver docs/DECISOES_PENDENTES.md D-07.
  await changeOperationalStatus(actor, supplierId, {
    to: "REGULAR",
    action: "supplier.unblock",
    reason,
    context,
  });
}

// -----------------------------------------------------------------------------
// Governança (RF-014, RF-015, RN-003) — exclusivo de Compras.
// -----------------------------------------------------------------------------

export interface UpdateGovernanceInput {
  criticality?: Criticality;
  supplyType?: SupplyType;
  categoryIds?: string[];
  reason?: string;
}

export async function updateSupplierGovernance(
  actor: Actor,
  supplierId: string,
  input: UpdateGovernanceInput,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.governance");

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });

  const criticalityChanged = input.criticality && input.criticality !== supplier.criticality;
  if (criticalityChanged && !input.reason?.trim()) {
    throw new SupplierServiceError("Mudança de criticidade exige motivo (RN-003).");
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: {
        criticality: input.criticality ?? supplier.criticality,
        supplyType: input.supplyType ?? supplier.supplyType,
      },
    });

    if (input.categoryIds) {
      await tx.supplierCategory.deleteMany({ where: { supplierId } });
      if (input.categoryIds.length > 0) {
        await tx.supplierCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({ supplierId, categoryId })),
        });
      }
    }

    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.governance.update",
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        reason: input.reason?.trim() || null,
        before: { criticality: supplier.criticality, supplyType: supplier.supplyType },
        after: { criticality: input.criticality ?? supplier.criticality, supplyType: input.supplyType ?? supplier.supplyType },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

// -----------------------------------------------------------------------------
// Responsáveis internos (RF-014)
// -----------------------------------------------------------------------------

export async function addSupplierResponsible(
  actor: Actor,
  supplierId: string,
  userId: string,
  type: SupplierResponsibleType,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.governance");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !["COMPRAS", "QSMS"].includes(user.role)) {
    throw new SupplierServiceError("Responsável deve ser um usuário interno de Compras ou QSMS.");
  }

  const existing = await prisma.supplierResponsible.findFirst({
    where: { supplierId, userId, type, active: true },
  });
  if (existing) throw new SupplierServiceError("Este usuário já é responsável deste tipo.");

  await prisma.$transaction(async (tx) => {
    await tx.supplierResponsible.create({ data: { supplierId, userId, type } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.responsible.add",
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        after: { userId, type },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}

/** Lista usuários internos elegíveis para responsável (Compras/QSMS ativos). */
export async function listAssignableResponsibleUsers(actor: Actor) {
  assertAuthorized(actor, "supplier.edit.governance");

  return prisma.user.findMany({
    where: { role: { in: ["COMPRAS", "QSMS"] }, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function removeSupplierResponsible(
  actor: Actor,
  supplierId: string,
  responsibleId: string,
  context: RequestContext,
) {
  assertAuthorized(actor, "supplier.edit.governance");

  const responsible = await prisma.supplierResponsible.findFirst({ where: { id: responsibleId, supplierId } });
  if (!responsible) throw new SupplierServiceError("Responsável não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.supplierResponsible.update({ where: { id: responsibleId }, data: { active: false } });
    await recordAudit(
      {
        actorId: actor.id,
        action: "supplier.responsible.remove",
        entityType: "Supplier",
        entityId: supplierId,
        supplierId,
        before: { userId: responsible.userId, type: responsible.type },
        context: auditCtx(context),
        visibility: "interna",
      },
      tx,
    );
  });
}
