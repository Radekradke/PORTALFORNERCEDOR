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
  { href: "/fornecedores", label: "Fornecedores", enabled: true },
  { href: "/categorias", label: "Categorias", roles: ["ADMIN_TI", "COMPRAS", "QSMS"], enabled: true },
  { href: "/requisitos", label: "Requisitos", roles: ["ADMIN_TI", "COMPRAS", "QSMS"], enabled: true },
  { href: "/documentos", label: "Documentos", enabled: true },
  { href: "/checklists", label: "Checklists", roles: ["ADMIN_TI", "COMPRAS", "QSMS"], enabled: true },
  { href: "/fiscalizacoes", label: "Fiscalizações", enabled: true },
  { href: "/nao-conformidades", label: "Não conformidades", enabled: false },
  { href: "/relatorios", label: "Relatórios", enabled: false },
  { href: "/notificacoes", label: "Notificações", enabled: false },
  { href: "/usuarios", label: "Usuários e permissões", roles: ["ADMIN_TI"], enabled: true },
  { href: "/auditoria", label: "Auditoria", roles: ["ADMIN_TI", "COMPRAS", "QSMS"], enabled: true },
];

export const EXTERNAL_NAV: NavItem[] = [
  { href: "/portal-fornecedor", label: "Início", enabled: true },
  { href: "/portal-fornecedor/empresa", label: "Minha empresa", enabled: true },
  { href: "/portal-fornecedor/documentos", label: "Documentos", enabled: true },
  { href: "/portal-fornecedor/qualificacao", label: "Qualificação", enabled: true },
  { href: "/portal-fornecedor/fiscalizacoes", label: "Fiscalizações", enabled: true },
  { href: "/portal-fornecedor/nao-conformidades", label: "Não conformidades e planos", enabled: false },
  { href: "/portal-fornecedor/notificacoes", label: "Notificações", enabled: false },
  { href: "/portal-fornecedor/usuarios", label: "Usuários da empresa", roles: ["FORNECEDOR_ADMIN"], enabled: false },
  { href: "/portal-fornecedor/historico", label: "Histórico", enabled: true },
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

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  CONVITE_ENVIADO: "Convite enviado",
  EM_PREENCHIMENTO: "Em preenchimento",
  ENVIADO_PARA_ANALISE: "Enviado para análise",
  EM_ANALISE: "Em análise",
  AJUSTES_SOLICITADOS: "Ajustes solicitados",
  CADASTRO_VALIDADO: "Cadastro validado",
  REJEITADO: "Rejeitado",
  INATIVO: "Inativo",
};

export const OPERATIONAL_STATUS_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  ATENCAO: "Atenção",
  IRREGULAR: "Irregular",
  SUSPENSO: "Suspenso",
  BLOQUEADO: "Bloqueado",
};

export const CRITICALITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  COMERCIAL: "Comercial",
  FINANCEIRO: "Financeiro",
  TECNICO: "Técnico",
  QSMS: "QSMS",
  OUTRO: "Outro",
};

export const RESPONSIBLE_TYPE_LABELS: Record<string, string> = {
  COMPRADOR: "Comprador",
  GESTOR_CONTRATO: "Gestor do contrato",
  FISCAL: "Fiscal",
};

export const SUPPLY_TYPE_LABELS: Record<string, string> = {
  MATERIAL: "Material",
  SERVICO: "Serviço",
  AMBOS: "Material e serviço",
};

export const OBLIGATION_LABELS: Record<string, string> = {
  OBRIGATORIO: "Obrigatório",
  CONDICIONAL: "Condicional",
  INFORMATIVO: "Informativo",
};

export const VALIDITY_TYPE_LABELS: Record<string, string> = {
  FIXA: "Validade fixa (dias a partir da emissão)",
  INFORMADA: "Validade informada no envio",
  SEM_VENCIMENTO: "Sem vencimento",
};

export const DOCUMENT_VERSION_STATUS_LABELS: Record<string, string> = {
  ENVIADO: "Enviado",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export const QUALIFICATION_STATUS_LABELS: Record<string, string> = {
  NAO_INICIADA: "Não iniciada",
  DOCUMENTACAO_PENDENTE: "Documentação pendente",
  EM_VALIDACAO: "Em validação",
  APROVADO: "Aprovado",
  APROVADO_COM_RESSALVAS: "Aprovado com ressalvas",
  REPROVADO: "Reprovado",
  EM_REQUALIFICACAO: "Em requalificação",
};

export const QUALIFICATION_RESULT_LABELS: Record<string, string> = {
  APROVADO: "Aprovado",
  APROVADO_COM_RESSALVAS: "Aprovado com ressalvas",
  REPROVADO: "Reprovado",
};

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  PROGRAMADA: "Programada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const INSPECTION_RESPONSE_LABELS: Record<string, string> = {
  CONFORME: "Conforme",
  CONFORME_COM_RESSALVA: "Conforme com ressalva",
  NAO_CONFORME: "Não conforme",
  NAO_APLICAVEL: "Não aplicável",
};

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  NAO_APLICAVEL: "Não aplicável",
  PENDENTE: "Pendente",
  AGUARDANDO_ANALISE: "Aguardando análise",
  REJEITADO: "Rejeitado",
  ATENDIDO: "Atendido",
  VENCENDO: "Vencendo",
  VENCIDO: "Vencido",
};
