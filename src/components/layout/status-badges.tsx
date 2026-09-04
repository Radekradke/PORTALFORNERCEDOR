import { Badge } from "@/components/ui/badge";
import {
  REGISTRATION_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  CRITICALITY_LABELS,
  COMPLIANCE_STATUS_LABELS,
  DOCUMENT_VERSION_STATUS_LABELS,
} from "./nav-config";

const REGISTRATION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  CONVITE_ENVIADO: "secondary",
  EM_PREENCHIMENTO: "secondary",
  ENVIADO_PARA_ANALISE: "warning",
  EM_ANALISE: "warning",
  AJUSTES_SOLICITADOS: "warning",
  CADASTRO_VALIDADO: "success",
  REJEITADO: "destructive",
  INATIVO: "secondary",
};

export function RegistrationStatusBadge({ status }: { status: string }) {
  return <Badge variant={REGISTRATION_VARIANT[status] ?? "default"}>{REGISTRATION_STATUS_LABELS[status] ?? status}</Badge>;
}

const OPERATIONAL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  REGULAR: "success",
  ATENCAO: "warning",
  IRREGULAR: "warning",
  SUSPENSO: "destructive",
  BLOQUEADO: "destructive",
};

export function OperationalStatusBadge({ status }: { status: string }) {
  return <Badge variant={OPERATIONAL_VARIANT[status] ?? "default"}>{OPERATIONAL_STATUS_LABELS[status] ?? status}</Badge>;
}

const CRITICALITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  BAIXA: "secondary",
  MEDIA: "default",
  ALTA: "warning",
  CRITICA: "destructive",
};

export function CriticalityBadge({ criticality }: { criticality: string | null }) {
  if (!criticality) return <span className="text-xs text-muted-foreground">—</span>;
  return <Badge variant={CRITICALITY_VARIANT[criticality] ?? "default"}>{CRITICALITY_LABELS[criticality] ?? criticality}</Badge>;
}

const COMPLIANCE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  NAO_APLICAVEL: "secondary",
  PENDENTE: "secondary",
  AGUARDANDO_ANALISE: "warning",
  REJEITADO: "destructive",
  ATENDIDO: "success",
  VENCENDO: "warning",
  VENCIDO: "destructive",
};

export function ComplianceStatusBadge({ status }: { status: string }) {
  return <Badge variant={COMPLIANCE_VARIANT[status] ?? "default"}>{COMPLIANCE_STATUS_LABELS[status] ?? status}</Badge>;
}

const DOCUMENT_VERSION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  ENVIADO: "secondary",
  EM_ANALISE: "warning",
  APROVADO: "success",
  REJEITADO: "destructive",
};

export function DocumentVersionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={DOCUMENT_VERSION_VARIANT[status] ?? "default"}>
      {DOCUMENT_VERSION_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
