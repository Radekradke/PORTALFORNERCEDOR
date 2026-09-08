import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { ROLE_LABELS } from "@/components/layout/nav-config";
import { getDashboardKpis, getPersonalQueue, getIcoBySupplier, getAverageIco } from "@/modules/dashboard/services/dashboard-service";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { Forbidden } from "@/components/layout/forbidden";

export default async function DashboardPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "dashboard.view")) return <Forbidden />;

  const [kpis, queue, averageIco, icoBySupplier] = await Promise.all([
    getDashboardKpis(actor),
    getPersonalQueue(actor),
    getAverageIco(actor),
    getIcoBySupplier(actor),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo(a), {actor.name} — perfil {ROLE_LABELS[actor.role]}.
        </p>
      </div>

      {/* RF-110 a RF-112, CA-17: cada cartão leva à lista já filtrada correspondente. */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Indicadores gerais</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Link key={kpi.key} href={kpi.href}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="flex flex-col gap-1 p-4">
                  <span className="text-2xl font-semibold">{kpi.value}</span>
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* RF-111: pendências específicas do usuário autenticado, não uma fila geral. */}
      {queue.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Minha fila</h2>
          <div className="flex flex-col gap-2">
            {queue.map((item) => (
              <Link key={item.label} href={item.href}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-lg font-semibold">{item.count}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* RF-113, RN-023, D-09: ICO é uma proposta ainda não aprovada — nunca usar para decisão automática. */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Índice de Conformidade Operacional (ICO)</h2>
        <Card>
          <CardHeader>
            <CardTitle>ICO médio: {averageIco !== null ? `${averageIco.toFixed(0)}` : "sem dados suficientes"}</CardTitle>
            <CardDescription>
              Informativo — fórmula proposta (documentação 40% + fiscalizações 40% + não conformidades
              20%), ainda não aprovada pelo dono do processo. Nunca usado para bloquear ou decidir
              nada automaticamente (RN-016).
            </CardDescription>
          </CardHeader>
          {icoBySupplier.length > 0 && (
            <CardContent className="overflow-x-auto pt-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Fornecedor</th>
                    <th className="py-2 pr-4">Documentação</th>
                    <th className="py-2 pr-4">Fiscalizações</th>
                    <th className="py-2 pr-4">NCs</th>
                    <th className="py-2 pr-4">ICO</th>
                  </tr>
                </thead>
                <tbody>
                  {icoBySupplier.map((s) => (
                    <tr key={s.supplierId} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/fornecedores/${s.supplierId}`} className="hover:underline">
                          {s.legalName}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{s.documentationScore !== null ? s.documentationScore.toFixed(0) : "—"}</td>
                      <td className="py-2 pr-4">{s.inspectionScore !== null ? s.inspectionScore.toFixed(0) : "—"}</td>
                      <td className="py-2 pr-4">{s.nonConformityScore !== null ? s.nonConformityScore.toFixed(0) : "—"}</td>
                      <td className="py-2 pr-4 font-semibold">{s.score !== null ? s.score.toFixed(0) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
