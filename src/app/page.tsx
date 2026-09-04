import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";

export default async function RootPage() {
  const actor = await getCurrentActor();
  redirect(actor ? "/dashboard" : "/login");
}
