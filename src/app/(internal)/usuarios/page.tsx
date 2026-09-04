import Link from "next/link";
import { getCurrentActor } from "@/modules/auth-access/services/current-actor";
import { authorize } from "@/modules/auth-access/domain/authorize";
import { listInternalUsers } from "@/modules/users-permissions/services/user-service";
import { Forbidden } from "@/components/layout/forbidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, PERMISSION_LABELS } from "@/components/layout/nav-config";
import { formatDateTime } from "@/lib/time";
import { UserRowActions } from "./user-row-actions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "success"> = {
  ACTIVE: "success",
  INVITED: "secondary",
  BLOCKED: "destructive",
  INACTIVE: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INVITED: "Convite pendente",
  BLOCKED: "Bloqueado",
  INACTIVE: "Inativo",
};

export default async function UsersPage() {
  const actor = await getCurrentActor();
  if (!actor || !authorize(actor, "user.view")) {
    return <Forbidden />;
  }

  const users = await listInternalUsers(actor);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuários e permissões</h1>
          <p className="text-muted-foreground">
            Perfis-base internos: Administrador de TI, Suprimentos/Compras e QSMS. Permissões
            sensíveis são concedidas individualmente.
          </p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo">Novo usuário</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Permissões sensíveis</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum usuário interno cadastrado ainda.
              </TableCell>
            </TableRow>
          )}
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <Link href={`/usuarios/${user.id}`} className="hover:underline">
                  {user.name}
                </Link>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{ROLE_LABELS[user.role]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABELS[user.status]}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {user.grantedPermissions.length === 0
                  ? "—"
                  : user.grantedPermissions.map((p) => PERMISSION_LABELS[p.permission]).join(", ")}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca acessou"}
              </TableCell>
              <TableCell className="text-right">
                <UserRowActions userId={user.id} status={user.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
