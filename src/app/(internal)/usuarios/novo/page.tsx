import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { Forbidden } from "@/components/layout/forbidden";
import { NewUserForm } from "./new-user-form";

export default async function NewUserPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "user.create")) {
    return <Forbidden />;
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Novo usuário interno</h1>
      <p className="mb-6 text-muted-foreground">
        Um e-mail de ativação será enviado para que a pessoa defina a própria senha.
      </p>
      <NewUserForm />
    </div>
  );
}
