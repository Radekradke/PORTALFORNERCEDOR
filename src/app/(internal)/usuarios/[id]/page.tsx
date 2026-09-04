import { notFound } from "next/navigation";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { getInternalUserById } from "@/modules/users-permissions/services/user-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, PERMISSION_LABELS } from "@/components/layout/nav-config";
import { formatDateTime } from "@/lib/time";
import { PermissionToggle } from "./permission-toggle";

const GRANTABLE_ROLES = ["COMPRAS", "QSMS"];
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "user.view")) {
    return <Forbidden />;
  }

  const user = await getInternalUserById(actor, params.id);
  if (!user) notFound();

  const grantedSet = new Set(user.grantedPermissions.map((p) => p.permission));
  const canManagePermissions = authorize(actor, "permission.grant") && GRANTABLE_ROLES.includes(user.role);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Perfil</p>
            <p className="font-medium">{ROLE_LABELS[user.role]}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Situação</p>
            <Badge>{user.status}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Criado em</p>
            <p className="font-medium">{formatDateTime(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Último acesso</p>
            <p className="font-medium">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca acessou"}</p>
          </div>
        </CardContent>
      </Card>

      {GRANTABLE_ROLES.includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle>Permissões sensíveis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ALL_PERMISSIONS.map((permission) => {
              const granted = grantedSet.has(permission as never);
              return (
                <div key={permission} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm">{PERMISSION_LABELS[permission]}</span>
                  {canManagePermissions ? (
                    <PermissionToggle userId={user.id} permission={permission} granted={granted} />
                  ) : (
                    <Badge variant={granted ? "success" : "outline"}>{granted ? "Concedida" : "Não concedida"}</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
