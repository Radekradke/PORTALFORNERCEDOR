import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { listSupplierRequirements } from "@/modules/documents/services/document-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceStatusBadge, DocumentVersionStatusBadge } from "@/components/layout/status-badges";
import { OBLIGATION_LABELS } from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";
import { UploadForm } from "./upload-form";

export default async function PortalDocumentosPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const requirements = await listSupplierRequirements(actor, actor.supplierId);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Documentos</h1>
        <p className="text-muted-foreground">
          Requisitos aplicáveis à sua empresa, validade e parecer de cada envio (RF-051).
        </p>
      </div>

      {requirements.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhum requisito documental aplicável no momento. Isso normalmente aparece depois que seu
            cadastro é validado pela Lifting.
          </CardContent>
        </Card>
      )}

      {requirements.map((req) => (
        <Card key={req.id} data-testid={`requirement-${req.id}`}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{req.requirementType.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{OBLIGATION_LABELS[req.obligation]}</p>
            </div>
            <ComplianceStatusBadge status={req.compliance.status} />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {req.compliance.currentVersion && (
              <p className="text-sm">
                Versão vigente: <strong>#{req.compliance.currentVersion.versionNumber}</strong>
                {req.compliance.currentVersion.validUntil &&
                  ` · válida até ${formatDate(req.compliance.currentVersion.validUntil)}`}
              </p>
            )}

            {/* RN-006: a versão vigente continua valendo enquanto uma nova é analisada — mas o
                fornecedor precisa saber que o envio dele já está em fila, não perdido. */}
            {req.compliance.currentVersion && req.compliance.hasPendingReview && (
              <p className="text-sm text-warning">Há uma nova versão enviada aguardando análise.</p>
            )}

            {req.versions.length > 0 && (
              <div className="flex flex-col gap-2">
                {req.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                    <div>
                      <p>
                        Versão #{v.versionNumber} — enviada em {formatDateTime(v.createdAt)}
                      </p>
                      {v.status === "REJEITADO" && v.reviewReason && (
                        <p className="mt-1 text-destructive">Motivo: {v.reviewReason}</p>
                      )}
                    </div>
                    <DocumentVersionStatusBadge status={v.status} />
                  </div>
                ))}
              </div>
            )}

            <UploadForm
              supplierRequirementId={req.id}
              validityType={req.requirementType.validityType}
              needsIssueDate={req.requirementType.needsIssueDate}
              allowedFormats={req.requirementType.allowedFormats}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
