# Regras funcionais v0.1-R1

## Objetivo do MVP

Centralizar o ciclo do fornecedor: convite, cadastro, documentos, qualificação, fiscalização, evidências, não conformidades, plano de ação, decisão e histórico auditável.

## Escopo incluído

1. Autenticação, recuperação de acesso e sessões.
2. Usuários internos e externos, perfis-base e permissões sensíveis.
3. Cadastro de fornecedor por CNPJ, contatos, categorias, criticidade e responsáveis.
4. Matriz configurável de requisitos por categoria e criticidade.
5. Documentos com versão, validade, análise, rejeição e alertas.
6. Processo de qualificação com decisão rastreável.
7. Modelos de checklist e fiscalizações responsivas.
8. Evidências com foto ou documento.
9. Não conformidades, planos de ação, correção e verificação.
10. Dashboard operacional, filtros, exportações permitidas, notificações internas e auditoria.
11. Portal externo restrito à empresa do fornecedor.

## Fora do MVP

ERP, consulta automática de CNPJ, assinatura digital, pagamento, aplicativo nativo, modo offline, OCR/IA, integração obrigatória com serviço externo e score automático definitivo.

## Perfis-base internos

| Perfil | Responsabilidade | Poderes principais |
|---|---|---|
| Administrador TI | Contas, perfis, parâmetros, integrações e suporte | Criar/bloquear usuários, administrar permissões e consultar auditoria; sem decisão de negócio por padrão |
| Suprimentos/Compras | Cadastro, convite, categoria, responsáveis, qualificação e gestão | Validar cadastro, alterar categoria/criticidade, consultar/exportar e decidir quando autorizado |
| QSMS | Documentos, fiscalizações, evidências, NCs, planos de ação e risco | Aprovar/rejeitar documentos, executar fiscalização, tratar NC e decidir quando autorizado |

Não criar perfil separado de aprovador ou consulta. Permissões sensíveis pertencem a usuários designados de Compras/QSMS, por exemplo:

- `qualification.decide`
- `supplier.suspend`
- `supplier.block`
- `supplier.unblock`
- `exception.accept`
- `nc.reopen`

A regra de decisão individual versus aprovação conjunta permanece configurável e deve ser confirmada com o negócio.

## Perfis externos

| Perfil | Pode | Não pode |
|---|---|---|
| Administrador do fornecedor | Editar dados permitidos, gerir contatos/usuários e responder pendências da própria empresa | Acessar outro fornecedor, decidir aprovação interna ou consultar auditoria global |
| Colaborador do fornecedor | Enviar documento/evidência e responder item autorizado | Administrar usuários, categorias ou decisões |

## Estados principais

### Cadastro

`CONVITE_ENVIADO -> PRE_CADASTRO -> EM_PREENCHIMENTO -> ENVIADO_PARA_ANALISE -> AJUSTES_SOLICITADOS -> CADASTRO_VALIDADO -> INATIVO`

O retorno para ajuste exige motivo e preserva o histórico.

### Qualificação

`NAO_INICIADA -> DOCUMENTACAO_PENDENTE -> EM_VALIDACAO -> APROVADO | APROVADO_COM_RESSALVAS | REPROVADO -> EM_REQUALIFICACAO`

Decisão final exige usuário autorizado, justificativa e snapshot dos dados avaliados.

### Situação operacional

`REGULAR | ATENCAO | IRREGULAR | SUSPENSO | BLOQUEADO`

Suspensão, bloqueio, desbloqueio e exceção exigem permissão sensível e justificativa. Automatismos devem apenas alertar até que a política seja aprovada.

### Documento

`PENDENTE -> ENVIADO -> EM_ANALISE -> APROVADO | REJEITADO -> VENCENDO -> VENCIDO`

Cada reenvio cria nova versão. A análise registra responsável, data, parecer, validade confirmada e motivo da rejeição quando aplicável.

### Fiscalização

`PROGRAMADA -> EM_ANDAMENTO -> CONCLUIDA` ou `CANCELADA`.

Checklist: `CONFORME | CONFORME_COM_RESSALVA | NAO_CONFORME | NAO_APLICAVEL`. Não aplicável exige justificativa. Não conforme pode gerar NC com vínculo de origem.

### Não conformidade

`ABERTA -> AGUARDANDO_PLANO -> PLANO_EM_ANALISE -> EM_CORRECAO -> AGUARDANDO_VERIFICACAO -> ENCERRADA`

Rejeição devolve ao passo adequado com justificativa. Reabertura exige QSMS ou Compras autorizado e fica auditada.

## Fluxos ponta a ponta

### Convite e qualificação

1. Compras informa CNPJ, razão social inicial, contato, categoria e criticidade proposta.
2. O sistema impede CNPJ duplicado e cria convite com validade.
3. O fornecedor completa o cadastro e envia para análise.
4. Compras valida dados cadastrais e vincula responsáveis.
5. A matriz gera requisitos aplicáveis.
6. O fornecedor envia documentos e QSMS analisa cada versão.
7. Usuário autorizado de Compras ou QSMS registra a decisão da qualificação.
8. O sistema publica o resultado ao fornecedor e mantém snapshot e log.

### Fiscalização e NC

1. QSMS programa a fiscalização e escolhe checklist.
2. Em campo, responde itens, inclui observação e evidência.
3. Não conformidade pode gerar NC com gravidade, responsável e prazo.
4. Fornecedor apresenta causa, ação, responsável, prazo e evidência.
5. QSMS ou Compras autorizado aceita, rejeita ou pede ajuste.
6. QSMS verifica a correção e encerra ou devolve.

## Entidades mínimas

`Organization`, `User`, `Role`, `Permission`, `UserPermission`, `Supplier`, `SupplierContact`, `SupplierCategory`, `Category`, `Requirement`, `RequirementRule`, `SupplierRequirement`, `Document`, `DocumentVersion`, `DocumentReview`, `Qualification`, `QualificationDecision`, `InspectionTemplate`, `InspectionTemplateItem`, `Inspection`, `InspectionAnswer`, `Evidence`, `NonConformity`, `ActionPlan`, `CorrectiveAction`, `Verification`, `Notification`, `AuditLog`.

Arquivos não ficam em colunas binárias do PostgreSQL. O banco mantém metadados, hash, dono, tipo, tamanho, chave privada e relações.

## Invariantes obrigatórias

- CNPJ normalizado e único.
- Usuário externo acessa somente a própria organização.
- Mudança crítica ocorre em transação e gera `AuditLog`.
- Aprovação/rejeição e decisão de estado exigem justificativa quando aplicável.
- Documento aprovado aponta para versão imutável.
- Evidência mantém autor, data, origem e hash.
- Exclusão lógica em registros de negócio; não apagar histórico auditável.
- Datas persistidas em UTC e exibidas no fuso configurado.
- Validações existem no servidor, não apenas na interface.

## Segurança e privacidade

- Senhas com Argon2id e política configurável.
- Sessão revogável, cookies `HttpOnly`, `Secure` em produção e `SameSite` adequado.
- Proteção CSRF em mutações autenticadas e rate limit em login/recuperação.
- Autorização por ação e recurso no servidor.
- URL de arquivo privada e temporária; validar organização, permissão e vínculo antes de assinar.
- Logar acesso sensível e exportações sem registrar senha, token ou conteúdo do documento.
- Coletar apenas dados necessários e permitir retenção configurável.

## Decisões pendentes que não devem ser inventadas

- Quando Compras e QSMS podem decidir individualmente ou precisam de decisão conjunta.
- Critérios objetivos de criticidade.
- Documentos por categoria e validade.
- Regras automáticas de alerta versus bloqueio.
- Fórmula de score e pesos.
- Prazos de SLA e escalonamento.
- Política de retenção, backup e ambiente de produção.

Implemente esses pontos como configuração ou registre `TODO(decisao-negocio)` sem criar regra definitiva.

