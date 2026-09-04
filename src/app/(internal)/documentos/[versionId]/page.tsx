import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getDocumentVersionDetail } from "@/modules/documents/services/document-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentVersionStatusBadge } from "@/components/layout/status-badges";
import { OBLIGATION_LABELS } from "@/components/layout/nav-config";
import { formatDate, formatDateTime } from "@/lib/time";
import { DocumentPreview } from "./document-preview";
import { ReviewActions } from "./review-actions";

export default async function DocumentReviewPage({ params }: { params: { versionId: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "document.view")) {
    return <Forbidden />;
  }

  const version = await getDocumentVersionDetail(actor, params.versionId);
  if (!version) notFound();

  const canReview = authorize(actor, "document.review");
  const requirement = version.supplierRequirement;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/fornecedores/${requirement.supplier.id}`} className="hover:underline">
            {requirement.supplier.legalName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">{requirement.requirementType.name}</h1>
        <p className="text-sm text-muted-foreground">Versão {version.versionNumber}</p>
        <div className="mt-2 flex gap-2">
          <DocumentVersionStatusBadge status={version.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentPreview versionId={version.id} mimeType={version.fileObject.mimeType} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadados</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Obrigatoriedade</p>
              <p className="font-medium">{OBLIGATION_LABELS[requirement.obligation]}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Número do documento</p>
              <p className="font-medium">{version.documentNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Emissor</p>
              <p className="font-medium">{version.issuer ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Emissão</p>
              <p className="font-medium">{version.issuedAt ? formatDate(version.issuedAt) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Validade</p>
              <p className="font-medium">{version.validUntil ? formatDate(version.validUntil) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Enviado por</p>
              <p className="font-medium">{version.submittedBy.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Observação do fornecedor</p>
              <p className="font-medium">{version.submitterNote ?? "—"}</p>
            </div>
            {version.reviewReason && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Parecer</p>
                <p className="font-medium">{version.reviewReason}</p>
              </div>
            )}
            {canReview && version.internalNote && (
              <div className="col-span-2 rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Observação interna (não visível ao fornecedor)</p>
                <p className="font-medium">{version.internalNote}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewActions versionId={version.id} status={version.status} currentValidUntil={version.validUntil} />
          </CardContent>
        </Card>
      )}

      {requirement.versions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Versões anteriores</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {requirement.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div>
                  <Link href={`/documentos/${v.id}`} className="font-medium hover:underline">
                    Versão {v.versionNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Enviado por {v.submittedBy.name} em {formatDateTime(v.createdAt)}
                  </p>
                </div>
                <DocumentVersionStatusBadge status={v.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
