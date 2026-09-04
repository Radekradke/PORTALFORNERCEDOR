import { Badge } from "@/components/ui/badge";
import {
  REGISTRATION_STATUS_LABELS,
  OPERATIONAL_STATUS_LABELS,
  CRITICALITY_LABELS,
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
