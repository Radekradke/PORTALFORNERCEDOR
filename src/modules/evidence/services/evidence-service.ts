import { prisma } from "@/lib/prisma";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { isExternal } from "@/modules/auth-access/domain/actor";
import type { Actor } from "@/modules/auth-access/domain/actor";
import { recordAudit } from "@/modules/audit/services/audit-service";
import { getStorageProvider } from "@/lib/storage";

export class EvidenceServiceError extends Error {}

interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}

const auditCtx = (context: RequestContext) => ({ source: "web" as const, ip: context.ip, userAgent: context.userAgent });

/**
 * Download privado de qualquer evidência — fiscalização, não conformidade
 * ou plano de ação (RF-077, RF-093, fluxo 6.3). `Evidence` é uma entidade
 * compartilhada entre as três origens desde a F6 (a especificação já a
 * descreve ligada a "Inspection/NC/Action"); este é o único ponto que
 * resolve dono e autorização antes de assinar a URL, para não duplicar a
 * lógica de download privado por origem.
 */
export async function getEvidenceDownloadUrl(actor: Actor, evidenceId: string, context: RequestContext): Promise<string> {
  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: {
      fileObject: true,
      inspectionAnswer: { include: { inspection: { select: { supplierId: true, status: true } } } },
      nonConformity: { select: { supplierId: true, status: true } },
      correctiveAction: { include: { nonConformity: { select: { supplierId: true, status: true } } } },
    },
  });
  if (!evidence) throw new EvidenceServiceError("Evidência não encontrada.");

  let supplierId: string;
  let releasedToSupplier: boolean;

  if (evidence.inspectionAnswer) {
    supplierId = evidence.inspectionAnswer.inspection.supplierId;
    // RF-133/EXT-05: só liberado ao fornecedor quando a fiscalização foi concluída.
    releasedToSupplier = evidence.inspectionAnswer.inspection.status === "CONCLUIDA";
    if (!authorize(actor, "inspection.view", { supplierId })) {
      throw new EvidenceServiceError("Evidência não encontrada.");
    }
  } else if (evidence.nonConformity) {
    supplierId = evidence.nonConformity.supplierId;
    // NC ainda em rascunho (ABERTA) nunca é visível ao fornecedor.
    releasedToSupplier = evidence.nonConformity.status !== "ABERTA";
    if (!authorize(actor, "nc.view", { supplierId })) {
      throw new EvidenceServiceError("Evidência não encontrada.");
    }
  } else if (evidence.correctiveAction) {
    supplierId = evidence.correctiveAction.nonConformity.supplierId;
    releasedToSupplier = evidence.correctiveAction.nonConformity.status !== "ABERTA";
    if (!authorize(actor, "nc.view", { supplierId })) {
      throw new EvidenceServiceError("Evidência não encontrada.");
    }
  } else {
    throw new EvidenceServiceError("Evidência não encontrada.");
  }

  // Mesmo padrão de getInspectionDetail (F5): não-throwing por design —
  // evita 500 e não revela a diferença entre "não existe" e "existe mas
  // não foi liberado" (RN-021, CA-03).
  if (isExternal(actor) && !releasedToSupplier) {
    throw new EvidenceServiceError("Evidência não encontrada.");
  }

  await recordAudit({
    actorId: actor.id,
    action: "evidence.download",
    entityType: "Evidence",
    entityId: evidenceId,
    supplierId,
    context: auditCtx(context),
    visibility: "interna",
  });

  return getStorageProvider().getSignedDownloadUrl(evidence.fileObject.storageKey, 60);
}
