import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { isExternal, isInternal } from "@/modules/auth-access/domain/actor";
import { Topbar } from "@/components/layout/topbar";
import { ExternalNav } from "@/components/layout/external-nav";
import { prisma } from "@/lib/prisma";

export default async function PortalFornecedorLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();

  // Checagem autoritativa no servidor (RNF-002): o middleware só evita flash de UI.
  if (!actor) redirect("/login");
  if (isInternal(actor)) redirect("/dashboard");
  if (!isExternal(actor) || !actor.supplierId) redirect("/login");

  const supplier = await prisma.supplier.findUnique({
    where: { id: actor.supplierId },
    select: { legalName: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar actor={actor} />
      <ExternalNav role={actor.role} />
      <div className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-6">
        Portal do fornecedor — {supplier?.legalName ?? "empresa"}
      </div>
      <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
    </div>
  );
}
