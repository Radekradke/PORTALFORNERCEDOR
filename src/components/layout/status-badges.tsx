import { Badge } from "@/components/ui/badge";
import {
  REGISTRATION_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  CRITICALITY_LABELS,
  COMPLIANCE_STATUS_LABELS,
  DOCUMENT_VERSION_STATUS_LABELS,
  QUALIFICATION_STATUS_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_RESPONSE_LABELS,
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

const QUALIFICATION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  NAO_INICIADA: "secondary",
  DOCUMENTACAO_PENDENTE: "warning",
  EM_VALIDACAO: "warning",
  APROVADO: "success",
  APROVADO_COM_RESSALVAS: "warning",
  REPROVADO: "destructive",
  EM_REQUALIFICACAO: "warning",
};

export function QualificationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={QUALIFICATION_VARIANT[status] ?? "default"}>{QUALIFICATION_STATUS_LABELS[status] ?? status}</Badge>
  );
}

const INSPECTION_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  PROGRAMADA: "secondary",
  EM_ANDAMENTO: "warning",
  CONCLUIDA: "success",
  CANCELADA: "destructive",
};

export function InspectionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={INSPECTION_STATUS_VARIANT[status] ?? "default"}>{INSPECTION_STATUS_LABELS[status] ?? status}</Badge>
  );
}

const INSPECTION_RESPONSE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  CONFORME: "success",
  CONFORME_COM_RESSALVA: "warning",
  NAO_CONFORME: "destructive",
  NAO_APLICAVEL: "secondary",
};

export function InspectionResponseBadge({ response }: { response: string | null }) {
  if (!response) return <span className="text-xs text-muted-foreground">Sem resposta</span>;
  return (
    <Badge variant={INSPECTION_RESPONSE_VARIANT[response] ?? "default"}>
      {INSPECTION_RESPONSE_LABELS[response] ?? response}
    </Badge>
  );
}
