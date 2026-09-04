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
| D-02 | Criticidade | Critérios objetivos de baixa/média/alta/crítica. | Não iniciado (entra em F2). |
| D-03 | Categorias | Taxonomia inicial de materiais/serviços. | Não iniciado (entra em F2/F3). |
| D-04 | Documentos | Tipos obrigatórios por categoria e validade. | Não iniciado (entra em F3). |
| D-05 | Aprovadores | Quais usuários específicos de Compras/QSMS recebem cada permissão sensível. | Mecanismo pronto (tela "Usuários e permissões"); a lista de quem recebe o quê é decisão operacional, não travada em código. |
| D-06 | SLA | Prazos de análise documental e correção de NC por gravidade. | Não iniciado (entra em F3/F6). |
| D-07 | Bloqueios | Quais eventos bloqueiam automaticamente vs. apenas alertam. | Não iniciado. Regra de produto: nenhum bloqueio automático definitivo sem aprovação (ver `guardar-escopo-mvp`). |
| D-08 | Projetos/contratos | Cadastro completo ou apenas referência por código/nome. | Não iniciado (entra em F5). |
| D-09 | Indicador ICO | Fórmula do Índice de Conformidade Operacional. | Não iniciado (entra em F7). Enquanto não aprovado, qualquer indicador é apenas informativo. |
| D-10 | Notificações | Destinatários e escalonamentos que evitam excesso de e-mail. | Não iniciado (entra em F3+). |
| D-11 | Retenção | Tempo de retenção de documentos, evidências, logs e contatos (LGPD). | Não iniciado. |
| D-12 | Identidade | Login local ou integração corporativa (Microsoft/Google) para contas internas. | **F1 usa autenticação local** (Argon2id) conforme stack obrigatória. Interface preparada para trocar/adicionar provedor sem reescrever o domínio (`AuthProvider` pode ser extraído quando a decisão for tomada). |
| D-13 | Infraestrutura | Hospedagem, storage e e-mail de produção. | F0 usa MinIO/Mailpit/PostgreSQL locais via Docker Compose, sem dependência paga. |
| D-14 | Fornecedor-piloto | Quais 5-10 fornecedores representam os fluxos iniciais. | Não se aplica ainda (sem cadastro de fornecedor na F1). |

## Decisões de implementação registradas nesta fatia (F1)

Não são regras de negócio, mas escolhas técnicas que vale registrar para não
serem re-discutidas a cada revisão:

- **Rate limit de login/recuperação é em memória por processo** (não
  distribuído). O controle de segurança crítico — bloqueio de conta por
  tentativas inválidas (RF-008) — está no banco (`User.failedLoginCount`/
  `lockedUntil`) e por isso é consistente mesmo com múltiplas instâncias. O
  limiter em memória é uma camada adicional. Ver `src/lib/rate-limit.ts`.
- **Mensagem de bloqueio de conta é específica** ("conta temporariamente
  bloqueada"), não genérica como a de credenciais inválidas. Isso favorece a
  usabilidade (o usuário sabe que deve esperar) em troca de uma pequena
  possibilidade de enumeração de e-mail cadastrado. RF-001 pede mensagem
  genérica apenas para "credenciais inválidas"; decisão registrada aqui para
  revisão futura se o negócio preferir uniformizar.
- **CSRF**: mutações usam Server Actions do Next.js, que validam
  Origin/Host da requisição. Não há formulário de mutação crítica fora de
  Server Actions nesta fatia.
