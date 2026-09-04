import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { ROLE_LABELS } from "@/components/layout/nav-config";

export default async function DashboardPage() {
  const actor = await getCurrentActor();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo(a), {actor?.name} — perfil {actor ? ROLE_LABELS[actor.role] : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fatia atual: Fundação e Acesso (F0 + F1)</CardTitle>
          <CardDescription>
            Os indicadores de risco (documentos vencidos, fiscalizações pendentes, NCs atrasadas,
            fornecedores com restrição) chegam nas fatias F2 a F7, conforme{" "}
            <code>PROMPT_MESTRE_CLAUDE.md</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Por enquanto este ambiente cobre login, sessão, recuperação de senha, gestão de usuários
          internos, permissões sensíveis e auditoria — a base sobre a qual as próximas fatias
          (fornecedores, documentos, qualificação, fiscalização e NC) serão construídas sem
          retrabalho.
        </CardContent>
      </Card>
    </div>
  );
}
