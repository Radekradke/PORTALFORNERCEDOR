# Decisões pendentes de negócio

Local central para `TODO(decisao-negocio)`. Nenhum destes pontos deve ser
resolvido com uma regra definitiva inventada durante a implementação — eles
ficam como configuração, valor padrão explícito ou bloqueio visível até que o
dono do processo decida (ver `docs/REGRAS_FUNCIONAIS.md` e Apêndice/seção 16
de `docs/ESPECIFICACAO_FUNCIONAL_v0.1_fonte.txt`).

## Da especificação funcional v0.1 (seção 16)

| ID | Tema | Pergunta | Status na F0/F1 |
|---|---|---|---|
| D-01 | Governança | Decisões sensíveis (qualificar, suspender, bloquear, aceitar exceção, reabrir NC) serão individuais ou exigirão aprovação conjunta de Compras e QSMS? | Modelado como permissão individual concedida pelo Admin TI (`UserPermission`). Aprovação conjunta **não** foi implementada — fica para quando a regra for aprovada. |
| D-02 | Criticidade | Critérios objetivos de baixa/média/alta/crítica. | Campo existe e é obrigatório no convite (RF-015), mas o critério de escolha continua sendo julgamento de quem cadastra — nenhuma regra automática decide a criticidade. |
| D-03 | Categorias | Taxonomia inicial de materiais/serviços. | Catálogo (`Category`) implementado e editável por Compras/QSMS na tela "Categorias"; a taxonomia inicial em si (quais categorias existem) é decisão operacional, não travada em código. |
| D-04 | Documentos | Tipos obrigatórios por categoria e validade. | Mecanismo pronto (tela "Requisitos": tipos de documento + matriz por categoria/criticidade); quais tipos existem e com qual validade em cada categoria é decisão operacional, não travada em código. |
| D-05 | Aprovadores | Quais usuários específicos de Compras/QSMS recebem cada permissão sensível. | Mecanismo pronto (tela "Usuários e permissões"); a lista de quem recebe o quê é decisão operacional, não travada em código. |
| D-06 | SLA | Prazos de análise documental e correção de NC por gravidade. | Não iniciado para documentos (fila RF-043 mostra idade, mas não há prazo-alvo definido); NC entra em F6. |
| D-07 | Bloqueios | Quais eventos bloqueiam automaticamente vs. apenas alertam. | Não iniciado. Regra de produto: nenhum bloqueio automático definitivo sem aprovação (ver `guardar-escopo-mvp`). |
| D-08 | Projetos/contratos | Cadastro completo ou apenas referência por código/nome. | Não iniciado (entra em F5). |
| D-09 | Indicador ICO | Fórmula do Índice de Conformidade Operacional. | Não iniciado (entra em F7). Enquanto não aprovado, qualquer indicador é apenas informativo. |
| D-10 | Notificações | Destinatários e escalonamentos que evitam excesso de e-mail. | Não iniciado (entra em F3+). |
| D-11 | Retenção | Tempo de retenção de documentos, evidências, logs e contatos (LGPD). | Não iniciado. |
| D-12 | Identidade | Login local ou integração corporativa (Microsoft/Google) para contas internas. | **F1 usa autenticação local** (Argon2id) conforme stack obrigatória. Interface preparada para trocar/adicionar provedor sem reescrever o domínio (`AuthProvider` pode ser extraído quando a decisão for tomada). |
| D-13 | Infraestrutura | Hospedagem, storage e e-mail de produção. | F0 usa MinIO/Mailpit/PostgreSQL locais via Docker Compose, sem dependência paga. |
| D-14 | Fornecedor-piloto | Quais 5-10 fornecedores representam os fluxos iniciais. | Não se aplica ainda (sem cadastro de fornecedor na F1). |

## Decisões de implementação registradas na F1 (acesso e autorização)

Não são regras de negócio, mas escolhas técnicas que vale registrar para não
serem re-discutidas a cada revisão:

- **Rate limit de login/recuperação é em memória por processo** (não
  distribuído). O controle de segurança crítico — bloqueio de conta por
  tentativas inválidas (RF-008) — está no banco (`User.failedLoginCount`/
  `lockedUntil`) e por isso é consistente mesmo com múltiplas instâncias. O
  limiter em memória é uma camada adicional. Ver `src/lib/rate-limit.ts`.
- **O limite por e-mail+IP conta também logins bem-sucedidos, não só
  falhas** (20 tentativas / 5 min). Isso é proposital: ele mitiga flood de
  requisições, não substitui o bloqueio de conta (que já cobre força bruta
  via falhas). Ajustado nesta fatia (F2) depois de constatar, com o teste
  E2E de fornecedores rodando várias contas em sequência, que um valor
  atrelado a `LOGIN_MAX_ATTEMPTS` penalizava uso legítimo e intenso
  (múltiplas abas/dispositivos, ou um usuário testando vários fluxos).
- **Mensagem de bloqueio de conta é específica** ("conta temporariamente
  bloqueada"), não genérica como a de credenciais inválidas. Isso favorece a
  usabilidade (o usuário sabe que deve esperar) em troca de uma pequena
  possibilidade de enumeração de e-mail cadastrado. RF-001 pede mensagem
  genérica apenas para "credenciais inválidas"; decisão registrada aqui para
  revisão futura se o negócio preferir uniformizar.
- **CSRF**: mutações usam Server Actions do Next.js, que validam
  Origin/Host da requisição. Não há formulário de mutação crítica fora de
  Server Actions nesta fatia.

## Decisões de implementação registradas na F2 (fornecedores)

- **`Organization` (F1) foi renomeada para `Supplier`** e ganhou todos os
  campos cadastrais nesta fatia, em vez de existirem como duas entidades
  paralelas. `docs/REGRAS_FUNCIONAIS.md` lista "Organization" e "Supplier"
  separadamente no resumo de entidades; entendemos isso como o mesmo
  conceito (o fornecedor É o limite de isolamento externo), já que a
  especificação completa (seção 11) só define "Supplier", com exatamente
  os campos que implementamos. `User.supplierId` é o vínculo de isolamento
  usado por `authorize()`.
- **Estados do cadastro reconciliados entre os dois documentos-fonte**:
  `docs/REGRAS_FUNCIONAIS.md` (resumo) omite `EM_ANALISE` e `REJEITADO`, mas
  a especificação completa (seção 5.1) os define com transições próprias.
  Implementamos a versão completa (mais precisa) e não criamos um estado
  separado de "pré-cadastro" — o próprio registro que Compras cria em
  `CONVITE_ENVIADO` já cumpre esse papel.
- **RF-131 ("campos liberados" vs. "mudanças sensíveis que retornam para
  análise") foi simplificado**: como não há decisão de negócio sobre quais
  campos são sensíveis, o fornecedor só pode editar o cadastro enquanto ele
  está em preenchimento/ajustes solicitados — nunca durante análise ou após
  validado. Reabrir para edição pós-validação exige contato com Compras
  (sem fluxo dedicado ainda).
- **Suspender/bloquear/desbloquear situação operacional são sempre
  manuais** nesta fatia, mesmo já usando as permissões sensíveis definidas
  na F1. O cômputo automático de `ATENCAO`/`IRREGULAR` a partir de
  documentos/NC é responsabilidade de F3+ (ver D-07); desbloquear sempre
  volta para `REGULAR` até lá.
- **Convite de fornecedor reaproveita o mecanismo de convite/redefinição de
  senha da F1** (`PasswordResetToken` + `requestPasswordReset(..., "invite")`):
  não existe um token de convite específico do `Supplier`.
- **RF-024 (importação em lote) e RF-007 (fornecedor convida/bloqueia
  colaborador) são SHOULD e ficaram fora desta fatia**, para manter o
  escopo entregável; não foram esquecidos, apenas adiados.

## Decisões de implementação registradas na F3 (requisitos e documentos)

- **`Document` (citado em `docs/REGRAS_FUNCIONAIS.md`) foi fundido em
  `SupplierRequirement`**, mesmo padrão de simplificação já aplicado à
  fusão Organization/Supplier na F2: o "requisito aplicável ao fornecedor"
  e o "registro lógico do documento" são o mesmo conceito nesta
  implementação — `DocumentVersion` aponta direto para
  `SupplierRequirement`, sem uma tabela `Document` intermediária.
- **"Vencendo"/"Vencido" são calculados na leitura, nunca persistidos.**
  RF-048 pede atualização diária, o que sugeriria um job agendado; como a
  stack não tem um worker/cron separado nesta fatia (só o processo Next.js
  contínuo) e o valor é uma função pura de `validUntil` + janelas de alerta
  + data atual, calcular sob demanda é sempre correto e evita inventar
  infraestrutura de agendamento sem necessidade. Feature de notificação
  proativa (avisar por e-mail quando entra na janela) fica para F7,
  junto de D-10.
- **RF-037 (exceção/dispensa formal) e RF-044 (atribuição de análise a um
  usuário específico) são SHOULD e ficaram fora desta fatia** — mesmo
  padrão de adiamento deliberado já usado para RF-024/RF-007 na F2.
  RF-051 ("...ou exceção válida") portanto só considera hoje: obrigatório
  + versão vigente aprovada e não vencida.
- **"Iniciar análise" de documento é opcional, não obrigatório**: aprovar
  ou rejeitar funciona tanto a partir de `ENVIADO` quanto de `EM_ANALISE`
  (mesma leniência já usada no fluxo de revisão de cadastro da F2), para
  não forçar um clique extra sem valor de negócio claro.
- **RN-004 ("elimina duplicidades por tipo")**: quando mais de uma regra
  ativa aponta para o mesmo tipo de documento (categorias diferentes do
  mesmo fornecedor), prevalece a obrigatoriedade mais forte
  (Obrigatório > Condicional > Informativo) — não há regra do negócio
  definindo esse desempate, então adotamos a opção mais conservadora
  (mais exigente) por padrão de segurança de conformidade.
- **Motivo de rejeição sempre externo, observação interna sempre
  separada** (RF-050, RN-009): `reviewReason` (obrigatório na rejeição,
  visível ao fornecedor) e `internalNote` (opcional, nunca retornado nas
  consultas do portal externo) são campos distintos desde o schema — não
  depende de filtrar na camada de apresentação.
