import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { getSupplierById } from "@/modules/suppliers/services/supplier-service";
import { listSupplierExternalHistory } from "@/modules/audit/services/audit-query-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationStatusBadge, OperationalStatusBadge } from "@/components/layout/status-badges";
import { Button } from "@/components/ui/button";

const PENDING_ACTION_COPY: Record<string, { title: string; description: string; cta?: { href: string; label: string } }> = {
  CONVITE_ENVIADO: {
    title: "Complete o cadastro da sua empresa",
    description: "Preencha os dados cadastrais e ao menos um contato para poder enviar para análise.",
    cta: { href: "/portal-fornecedor/empresa", label: "Ir para Minha empresa" },
  },
  EM_PREENCHIMENTO: {
    title: "Continue o cadastro da sua empresa",
    description: "Complete os dados obrigatórios e envie para análise da equipe Lifting.",
    cta: { href: "/portal-fornecedor/empresa", label: "Continuar cadastro" },
  },
  ENVIADO_PARA_ANALISE: {
    title: "Cadastro em análise",
    description: "A equipe de Suprimentos/Compras está avaliando seus dados. Você será notificado(a) assim que houver uma decisão.",
  },
  EM_ANALISE: {
    title: "Cadastro em análise",
    description: "A equipe de Suprimentos/Compras está avaliando seus dados. Você será notificado(a) assim que houver uma decisão.",
  },
  AJUSTES_SOLICITADOS: {
    title: "Ajustes solicitados",
    description: "Corrija os itens indicados e envie novamente para análise.",
    cta: { href: "/portal-fornecedor/empresa", label: "Corrigir cadastro" },
  },
  CADASTRO_VALIDADO: {
    title: "Cadastro validado",
    description: "Seus dados cadastrais foram aprovados pela Lifting.",
  },
  REJEITADO: {
    title: "Cadastro rejeitado",
    description: "Veja o motivo no histórico e entre em contato com a Lifting se tiver dúvidas.",
  },
  INATIVO: {
    title: "Cadastro inativo",
    description: "Este cadastro está inativo no momento.",
  },
};

export default async function PortalInicioPage() {
  const actor = await getCurrentActor();
  if (!actor?.supplierId) return null;

  const supplier = await getSupplierById(actor, actor.supplierId);
  if (!supplier) return null;

  const pending = PENDING_ACTION_COPY[supplier.registrationStatus];
  const historyItems = (await listSupplierExternalHistory(actor, supplier.id)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="text-muted-foreground">Bem-vindo(a), {actor.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{supplier.legalName}</CardTitle>
          <CardDescription className="flex flex-wrap gap-2 pt-1">
            <RegistrationStatusBadge status={supplier.registrationStatus} />
            <OperationalStatusBadge status={supplier.operationalStatus} />
          </CardDescription>
        </CardHeader>
        {pending && (
          <CardContent>
            <p className="font-medium">{pending.title}</p>
            <p className="text-sm text-muted-foreground">{pending.description}</p>
            {pending.cta && (
              <Button asChild className="mt-3">
                <Link href={pending.cta.href}>{pending.cta.label}</Link>
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {historyItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimas atualizações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {historyItems.map((event) => (
              <div key={event.id} className="border-b pb-2 last:border-0">
                <p>{event.action}</p>
                {event.reason && <p className="text-xs text-muted-foreground">{event.reason}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
