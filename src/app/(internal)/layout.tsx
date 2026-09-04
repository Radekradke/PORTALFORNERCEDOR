import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { isInternal } from "@/modules/auth-access/domain/actor";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();

  // Checagem autoritativa no servidor (RNF-002): o middleware só evita flash de UI.
  if (!actor || !isInternal(actor)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={actor.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar actor={actor} />
        <MobileNav role={actor.role} />
        <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
