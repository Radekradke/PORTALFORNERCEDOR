import Link from "next/link";
import { OBLIGATION_LABELS } from "@/components/layout/nav-config";
import { ComplianceStatusBadge } from "@/components/layout/status-badges";
import { formatDate } from "@/lib/time";
import { ReapplyMatrixButton } from "./reapply-matrix-button";

interface RequirementRow {
  id: string;
  obligation: string;
  applicable: boolean;
  requirementType: { name: string };
  compliance: {
    status: string;
    currentVersion: { versionNumber: number; validUntil: Date | string | null } | null;
    latestVersion: { id: string; versionNumber: number } | null;
  };
}

export function DocumentsSection({
  supplierId,
  requirements,
  canReapply,
}: {
  supplierId: string;
  requirements: RequirementRow[];
  canReapply: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {canReapply && <ReapplyMatrixButton supplierId={supplierId} />}

      {requirements.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum requisito aplicável ainda. Ele é gerado ao validar o cadastro ou reaplicar a matriz.
        </p>
      )}

      {requirements.map((req) => {
        const linkTarget = req.compliance.latestVersion ? `/documentos/${req.compliance.latestVersion.id}` : null;
        return (
          <div key={req.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div>
              {linkTarget ? (
                <Link href={linkTarget} className="font-medium hover:underline">
                  {req.requirementType.name}
                </Link>
              ) : (
                <p className="font-medium">{req.requirementType.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {OBLIGATION_LABELS[req.obligation]}
                {req.compliance.currentVersion?.validUntil &&
                  ` · válido até ${formatDate(req.compliance.currentVersion.validUntil)}`}
              </p>
            </div>
            <ComplianceStatusBadge status={req.compliance.status} />
          </div>
        );
      })}
    </div>
  );
}
