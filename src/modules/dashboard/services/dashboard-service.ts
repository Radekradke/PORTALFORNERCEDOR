import { prisma } from "@/lib/prisma";
import { assertAuthorized } from "@/modules/auth-access/domain/authorize";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { computeDocumentCompliance } from "@/modules/documents/services/document-compliance";
import { isOverdue } from "@/modules/nonconformities/services/nc-status";
import { documentationScore, inspectionScore, nonConformityScore, computeIco } from "./ico-calculator";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export interface KpiCard {
  key: string;
  label: string;
  value: number | string;
  href: string;
}

/**
 * RF-110 a RF-112, CA-17, seção 12.2: cada KPI corresponde a uma lista já
 * filtrada (o `href` de cada cartão). Calculado sob demanda a cada acesso
 * — mesmo padrão já usado em document-compliance/qualification-status/
 * nc-status: nenhum valor fica persistido nem depende de job agendado.
 */
export async function getDashboardKpis(actor: Actor): Promise<KpiCard[]> {
  assertAuthorized(actor, "dashboard.view");

  const now = new Date();

  const [
    activeSuppliers,
    operationalCounts,
    latestQualifications,
    activeRequirements,
    awaitingAnalysisCount,
    pendingInspections,
    openNcs,
  ] = await Promise.all([
    prisma.supplier.count({ where: { registrationStatus: "CADASTRO_VALIDADO" } }),
    prisma.supplier.groupBy({ by: ["operationalStatus"], _count: true }),
    latestQualificationRoundBySupplier(),
    prisma.supplierRequirement.findMany({
      where: { active: true },
      include: { requirementType: true, versions: { orderBy: { versionNumber: "desc" } } },
    }),
    prisma.documentVersion.count({ where: { status: { in: ["ENVIADO", "EM_ANALISE"] } } }),
    prisma.inspection.count({ where: { status: { in: ["PROGRAMADA", "EM_ANDAMENTO"] }, scheduledAt: { lte: now } } }),
    prisma.nonConformity.findMany({ where: { status: { not: "ENCERRADA" } }, select: { status: true, deadline: true } }),
  ]);

  let approvedCount = 0;
  let withConditionsCount = 0;
  for (const q of latestQualifications.values()) {
    if (q.result === "APROVADO") approvedCount++;
    if (q.result === "APROVADO_COM_RESSALVAS") withConditionsCount++;
  }

  const restrictedCount =
    (operationalCounts.find((o) => o.operationalStatus === "SUSPENSO")?._count ?? 0) +
    (operationalCounts.find((o) => o.operationalStatus === "BLOQUEADO")?._count ?? 0);

  let expiredCount = 0;
  let expiringSoonCount = 0;
  for (const req of activeRequirements) {
    const compliance = computeDocumentCompliance(req, req.versions, req.requirementType.alertWindowDays);
    if (compliance.status === "VENCIDO") expiredCount++;
    if (compliance.currentVersion?.validUntil) {
      const msLeft = compliance.currentVersion.validUntil.getTime() - now.getTime();
      if (msLeft >= 0 && msLeft <= THIRTY_DAYS_MS) expiringSoonCount++;
    }
  }

  const overdueNcCount = openNcs.filter((nc) => isOverdue(nc.status, nc.deadline, now)).length;

  return [
    { key: "active_suppliers", label: "Fornecedores ativos", value: activeSuppliers, href: "/fornecedores?status=CADASTRO_VALIDADO" },
    { key: "approved", label: "Aprovados", value: approvedCount, href: "/fornecedores" },
    { key: "with_conditions", label: "Com ressalvas", value: withConditionsCount, href: "/fornecedores" },
    { key: "restricted", label: "Suspensos/bloqueados", value: restrictedCount, href: "/fornecedores" },
    { key: "expired_documents", label: "Documentos vencidos", value: expiredCount, href: "/documentos" },
    { key: "expiring_documents", label: "Vencendo em 30 dias", value: expiringSoonCount, href: "/documentos" },
    { key: "awaiting_review", label: "Aguardando análise", value: awaitingAnalysisCount, href: "/documentos" },
    { key: "pending_inspections", label: "Fiscalizações pendentes", value: pendingInspections, href: "/fiscalizacoes?status=PROGRAMADA" },
    { key: "open_ncs", label: "NCs abertas", value: openNcs.length, href: "/nao-conformidades" },
    { key: "overdue_ncs", label: "NCs atrasadas", value: overdueNcCount, href: "/nao-conformidades" },
  ];
}

/** RF-111: pendências relacionadas ao usuário autenticado (não é fila geral). */
export interface PersonalQueueItem {
  label: string;
  count: number;
  href: string;
}

export async function getPersonalQueue(actor: Actor): Promise<PersonalQueueItem[]> {
  assertAuthorized(actor, "dashboard.view");

  const items: PersonalQueueItem[] = [];

  if (actor.role === "COMPRAS") {
    const registrationsToReview = await prisma.supplier.count({
      where: { registrationStatus: { in: ["ENVIADO_PARA_ANALISE", "EM_ANALISE"] } },
    });
    items.push({ label: "Cadastros aguardando análise", count: registrationsToReview, href: "/fornecedores?status=ENVIADO_PARA_ANALISE" });
  }

  if (actor.role === "QSMS") {
    const documentsToReview = await prisma.documentVersion.count({ where: { status: { in: ["ENVIADO", "EM_ANALISE"] } } });
    items.push({ label: "Documentos aguardando análise", count: documentsToReview, href: "/documentos" });

    const myInspections = await prisma.inspection.count({
      where: { inspectorId: actor.id, status: { in: ["PROGRAMADA", "EM_ANDAMENTO"] } },
    });
    items.push({ label: "Minhas fiscalizações em aberto", count: myInspections, href: "/fiscalizacoes" });
  }

  if (actor.sensitivePermissions.includes("NC_DECIDE")) {
    const plansToDecide = await prisma.nonConformity.count({ where: { status: "PLANO_EM_ANALISE" } });
    items.push({ label: "Planos de ação aguardando decisão", count: plansToDecide, href: "/nao-conformidades?status=PLANO_EM_ANALISE" });
  }

  const myNcs = await prisma.nonConformity.count({
    where: { responsibleInternalId: actor.id, status: { not: "ENCERRADA" } },
  });
  if (myNcs > 0) {
    items.push({ label: "NCs sob minha responsabilidade", count: myNcs, href: "/nao-conformidades" });
  }

  return items;
}

// -----------------------------------------------------------------------------
// ICO — RF-113, SHOULD, RN-023 (fórmula proposta, ainda não aprovada — D-09)
// -----------------------------------------------------------------------------

export interface SupplierIco {
  supplierId: string;
  legalName: string;
  documentationScore: number | null;
  inspectionScore: number | null;
  nonConformityScore: number | null;
  score: number | null;
  calculatedAt: Date;
}

async function latestQualificationRoundBySupplier() {
  const rounds = await prisma.qualification.findMany({
    select: { supplierId: true, round: true, result: true },
    orderBy: [{ supplierId: "asc" }, { round: "desc" }],
  });
  const map = new Map<string, { round: number; result: string | null }>();
  for (const r of rounds) {
    if (!map.has(r.supplierId)) map.set(r.supplierId, { round: r.round, result: r.result });
  }
  return map;
}

/** ICO por fornecedor elegível (cadastro validado) — usado no relatório e no "ICO médio" do dashboard. */
export async function getIcoBySupplier(actor: Actor): Promise<SupplierIco[]> {
  assertAuthorized(actor, "dashboard.view");

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getTime() - TWELVE_MONTHS_MS);

  const suppliers = await prisma.supplier.findMany({
    where: { registrationStatus: "CADASTRO_VALIDADO" },
    select: { id: true, legalName: true },
  });
  if (suppliers.length === 0) return [];

  const supplierIds = suppliers.map((s) => s.id);

  const [requirements, inspections, ncs] = await Promise.all([
    prisma.supplierRequirement.findMany({
      where: { supplierId: { in: supplierIds }, active: true, obligation: "OBRIGATORIO" },
      include: { requirementType: true, versions: { orderBy: { versionNumber: "desc" } } },
    }),
    prisma.inspection.findMany({
      where: {
        supplierId: { in: supplierIds },
        status: "CONCLUIDA",
        concludedAt: { gte: twelveMonthsAgo },
      },
      select: { supplierId: true, conformityPercentage: true },
    }),
    prisma.nonConformity.findMany({
      where: { supplierId: { in: supplierIds }, status: { not: "ENCERRADA" } },
      select: { supplierId: true, severity: true, status: true, deadline: true },
    }),
  ]);

  const results: SupplierIco[] = suppliers.map((supplier) => {
    const supplierRequirements = requirements.filter((r) => r.supplierId === supplier.id);
    const applicable = supplierRequirements.length;
    const approved = supplierRequirements.filter((r) => {
      const compliance = computeDocumentCompliance(r, r.versions, r.requirementType.alertWindowDays);
      return compliance.status === "ATENDIDO" || compliance.status === "VENCENDO";
    }).length;

    const percentages = inspections
      .filter((i) => i.supplierId === supplier.id && i.conformityPercentage !== null)
      .map((i) => i.conformityPercentage!);

    const supplierNcs = ncs
      .filter((nc) => nc.supplierId === supplier.id)
      .map((nc) => ({ severity: nc.severity, overdue: isOverdue(nc.status, nc.deadline, now) }));

    const ico = computeIco({
      documentationScore: documentationScore(approved, applicable),
      inspectionScore: inspectionScore(percentages),
      nonConformityScore: supplierNcs.length > 0 || applicable > 0 || percentages.length > 0 ? nonConformityScore(supplierNcs) : null,
    });

    return {
      supplierId: supplier.id,
      legalName: supplier.legalName,
      ...ico,
      calculatedAt: now,
    };
  });

  return results;
}

export async function getAverageIco(actor: Actor): Promise<number | null> {
  const perSupplier = await getIcoBySupplier(actor);
  const scores = perSupplier.map((s) => s.score).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((acc, s) => acc + s, 0) / scores.length;
}
