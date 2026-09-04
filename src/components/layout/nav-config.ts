import type { UserRole } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  /** Perfis que veem o item. Vazio = todos os perfis internos. */
  roles?: UserRole[];
  /** Itens do catálogo de telas (seção 7.1) ainda não implementados nesta fatia. */
  enabled: boolean;
}

export const INTERNAL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", enabled: true },
  { href: "/fornecedores", label: "Fornecedores", enabled: false },
  { href: "/documentos", label: "Documentos", enabled: false },
  { href: "/fiscalizacoes", label: "Fiscalizações", enabled: false },
  { href: "/nao-conformidades", label: "Não conformidades", enabled: false },
  { href: "/relatorios", label: "Relatórios", enabled: false },
  { href: "/notificacoes", label: "Notificações", enabled: false },
  { href: "/usuarios", label: "Usuários e permissões", roles: ["ADMIN_TI"], enabled: true },
  { href: "/auditoria", label: "Auditoria", roles: ["ADMIN_TI", "COMPRAS", "QSMS"], enabled: true },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN_TI: "Administrador de TI",
  COMPRAS: "Suprimentos / Compras",
  QSMS: "QSMS",
  FORNECEDOR_ADMIN: "Administrador do fornecedor",
  FORNECEDOR_COLABORADOR: "Colaborador do fornecedor",
};

export const PERMISSION_LABELS: Record<string, string> = {
  QUALIFICATION_DECIDE: "Decidir qualificação",
  SUPPLIER_SUSPEND: "Suspender fornecedor",
  SUPPLIER_BLOCK: "Bloquear fornecedor",
  SUPPLIER_UNBLOCK: "Desbloquear fornecedor",
  EXCEPTION_ACCEPT: "Aceitar exceção",
  NC_REOPEN: "Reabrir não conformidade",
};
