import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listDocumentQueue } from "@/modules/documents/services/document-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentVersionStatusBadge, CriticalityBadge } from "@/components/layout/status-badges";
import { formatDateTime } from "@/lib/time";

export default async function DocumentQueuePage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "document.view")) {
    return <Forbidden />;
  }

  const versions = await listDocumentQueue(actor);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Fila de documentos</h1>
        <p className="text-muted-foreground">
          Documentos enviados aguardando análise, do mais antigo para o mais recente (RF-043).
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Enviado em</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Tipo de documento</TableHead>
            <TableHead>Criticidade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviado por</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum documento aguardando análise no momento.
              </TableCell>
            </TableRow>
          )}
          {versions.map((version) => (
            <TableRow key={version.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(version.createdAt)}</TableCell>
              <TableCell>
                <Link
                  href={`/fornecedores/${version.supplierRequirement.supplier.id}`}
                  className="hover:underline"
                >
                  {version.supplierRequirement.supplier.legalName}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/documentos/${version.id}`} className="font-medium hover:underline">
                  {version.supplierRequirement.requirementType.name}
                </Link>
              </TableCell>
              <TableCell>
                <CriticalityBadge criticality={version.supplierRequirement.supplier.criticality} />
              </TableCell>
              <TableCell>
                <DocumentVersionStatusBadge status={version.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{version.submittedBy.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
