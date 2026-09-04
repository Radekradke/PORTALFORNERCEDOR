import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { isExternal } from "@/modules/auth-access/domain/actor";

export default async function RootPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  redirect(isExternal(actor) ? "/portal-fornecedor" : "/dashboard");
}
