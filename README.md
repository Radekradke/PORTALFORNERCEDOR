# Portal de Fiscalização e Gestão de Fornecedores — Lifting

Portal interno e portal do fornecedor para transformar o fornecedor em um
prontuário corporativo rastreável: convite → cadastro → requisitos →
documentos → qualificação → fiscalização → não conformidade → plano de ação
→ verificação → histórico.

A fonte de verdade das regras de negócio é `docs/REGRAS_FUNCIONAIS.md` (e o
documento completo em `docs/ESPECIFICACAO_FUNCIONAL_v0.1_fonte.txt`). Leia
também `CLAUDE.md` antes de alterar domínio, permissões, estados ou fluxos.

## Status desta entrega

**Fatias implementadas: F0 (Fundação) + F1 (Acesso e autorização) + F2 (Fornecedores) + F3 (Requisitos e documentos) + F4 (Qualificação) + F5 (Fiscalização).**

F0/F1 incluem: scaffold Next.js/TypeScript/Tailwind, Docker Compose
(PostgreSQL + MinIO + Mailpit), autenticação local (Argon2id), sessão em
banco, recuperação/definição de senha por e-mail, bloqueio de conta por
tentativas inválidas, gestão de usuários internos (Admin TI, Compras, QSMS),
permissões sensíveis individuais, guards server-side e trilha de auditoria.

F2 adiciona: convite de fornecedor por CNPJ (único e normalizado, com
validação de dígito verificador), catálogo de categorias, contatos,
criticidade e responsáveis internos, portal externo isolado por fornecedor
(`FORNECEDOR_ADMIN`/`FORNECEDOR_COLABORADOR`), ciclo completo de cadastro
(convite → preenchimento → envio para análise → análise → validado/ajustes/
rejeitado → inativo), e situação operacional manual (suspender/bloquear/
desbloquear) usando as permissões sensíveis já definidas na F1.

F3 adiciona: tipos de documento e matriz de requisitos por categoria/
criticidade (RF-030 a RF-038), aplicada automaticamente ao validar o
cadastro (e reaplicável sob demanda), upload privado de documento via MinIO/S3
com validação real de conteúdo (assinatura binária, não extensão),
versionamento sem sobrescrever arquivo/parecer anterior, fila e tela de
análise para QSMS (aprovar/rejeitar com motivo), cálculo de vencimento/
vencendo sob demanda, e download privado por URL temporária com auditoria
de acesso.

F4 adiciona: processo de qualificação por fornecedor (`Qualification`,
RF-060 a RF-067) com rodadas — a 1ª nasce automaticamente ao validar o
cadastro, junto com a matriz de requisitos; decisão final (aprovado,
aprovado com ressalvas ou reprovado) exige a permissão sensível
`QUALIFICATION_DECIDE` (já concedida a Compras e QSMS no seed), justificativa
obrigatória e snapshot dos requisitos/documentos avaliados no momento da
decisão; aprovação normal é bloqueada no servidor enquanto houver requisito
obrigatório não atendido (RN-010, CA-09) — só resta aprovar com ressalva
(condição + prazo obrigatórios) ou reprovar; requalificação (nova rodada)
é sempre manual e nunca apaga a rodada anterior (RF-065); o resultado é
publicado no portal do fornecedor.

F5 adiciona: modelos de checklist (`ChecklistTemplate`/`Section`/`Item`,
RF-070 a RF-073) com respostas configuráveis por item (Conforme/Conforme
com ressalva/Não conforme/Não aplicável) e regra de quando evidência ou
observação é obrigatória; programação de fiscalização (`Inspection`,
RF-075) que congela uma cópia do checklist no instante da criação (RF-074,
RN-013 — editar o modelo depois nunca afeta uma fiscalização já criada);
execução mobile-first com resposta por item salva progressivamente,
retomada automática (PROGRAMADA → EM ANDAMENTO no 1º item respondido),
anexo de foto/arquivo reaproveitando o storage privado da F3; conclusão
bloqueada no servidor enquanto houver item pendente (RF-078) e cálculo de
percentual de conformidade excluindo itens não aplicáveis (RN-015);
cancelamento com motivo (RF-082); resultado publicado no portal do
fornecedor só quando concluída (RF-133, EXT-05).

NC e dashboard de risco **ainda não existem** — entram nas fatias F6 e F7
(ver `PROMPT_MESTRE_CLAUDE.md`). O menu interno e o menu do portal externo
já mostram a arquitetura de informação completa da especificação, com os
itens ainda não implementados marcados como "em breve" (não são links
falsos).

## Stack

Next.js 14 (App Router) + TypeScript estrito, Tailwind CSS + componentes
shadcn/ui, PostgreSQL + Prisma, autenticação local com Argon2id, sessão
persistida em banco, `MailProvider`/`StorageProvider` como interfaces
(Mailpit e MinIO localmente), Zod, Vitest, Playwright, Docker Compose.
Nenhuma dependência paga é necessária para rodar o projeto.

## Pré-requisitos

- Node.js 20+ e npm.
- Docker e Docker Compose.

## Passo a passo (do zero)

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente (valores locais já compatíveis com o docker-compose)
cp .env.example .env

# 3. Subir PostgreSQL, MinIO e Mailpit
docker compose up -d

# 4. Gerar o client do Prisma
npm run prisma:generate

# 5. Rodar as migrations em banco vazio
npm run prisma:migrate

# 6. Popular dados fictícios de desenvolvimento (idempotente)
npm run prisma:seed

# 7. Rodar a aplicação
npm run dev
```

Acesse `http://localhost:3000`.

### Credenciais fictícias do seed (somente ambiente local)

**Usuários internos:**

| Perfil | E-mail | Senha |
|---|---|---|
| Admin TI | `admin.ti@lifting.local` | `AdminTi#2026Local` |
| Compras (decide qualificação, suspende, desbloqueia) | `compras@lifting.local` | `Compras#2026Local` |
| QSMS (decide qualificação, bloqueia, reabre NC) | `qsms@lifting.local` | `Qsms#2026Local` |
| Compras (bloqueado, para testar desbloqueio de usuário) | `compras.bloqueado@lifting.local` | `Bloqueado#2026Local` |
| QSMS (convite pendente, sem senha ainda) | `qsms.convite@lifting.local` | — (use "Esqueci minha senha" ou veja o e-mail no Mailpit) |

**Fornecedores (portal externo)** — três fornecedores fictícios em estados diferentes do ciclo de cadastro:

| Fornecedor | Estado cadastral | Situação | E-mail do admin | Senha |
|---|---|---|---|---|
| Alfa Materiais | Em preenchimento | Regular | `admin@alfa-materiais.local` | `Alfa#2026Local` |
| Beta Serviços | Enviado para análise | Regular | `admin@beta-servicos.local` | `Beta#2026Local` |
| Gama Industrial | Cadastro validado (3 requisitos pendentes, rodada 1 de qualificação aberta) | Bloqueado | `admin@gama-industrial.local` | `Gama#2026Local` |

**Requisitos semeados**: tipos de documento `ART` (validade fixa, 365 dias,
exige data de emissão, só PDF), `PPRA-PGR` (validade informada no envio) e
`ALVARA` (sem vencimento), com regras vinculando-os às categorias
"Materiais elétricos" e "Serviços de manutenção" por criticidade.

**Checklist semeado**: "Inspeção de segurança em campo" (categoria Serviços
de manutenção), com 2 seções e 3 itens prontos para programar uma
fiscalização de teste em `/fiscalizacoes/novo`.

### Ferramentas locais

- Aplicação: http://localhost:3000
- Mailpit (caixa de e-mail de desenvolvimento): http://localhost:8025
- MinIO Console (armazenamento privado): http://localhost:9001 (usuário/senha em `docker-compose.yml`)
- Health check: http://localhost:3000/api/health

## Comandos de verificação

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript estrito
npm run test        # Vitest (unitários — authorize(), senha, tokens, rate limit, CNPJ, conformidade documental, validação de arquivo, estado de qualificação, resultado de fiscalização)
npm run build       # build de produção

# Testes de ponta a ponta (requer app rodando em http://localhost:3000,
# banco semeado com prisma:seed, e Mailpit acessível em :8025)
npm run test:e2e
```

## Resetar o banco (voltar ao zero)

```bash
npm run db:reset   # aplica migrations do zero e roda o seed automaticamente
```

## Estrutura do projeto

```
src/
  app/                    # rotas Next.js (App Router)
    (auth)/               # login, esqueci-senha, redefinir-senha
    (internal)/           # dashboard, fornecedores, categorias, requisitos, documentos, checklists, fiscalizações, usuários, auditoria
    portal-fornecedor/    # portal externo (início, minha empresa, documentos, qualificação, fiscalizações, histórico)
    api/                  # health check, download privado de documento/evidência
  modules/                # domínio/serviços por módulo coerente
    auth-access/          # login, sessão, recuperação de senha, authorize()
    users-permissions/    # usuários internos e permissões sensíveis
    suppliers/            # cadastro, convite, revisão, situação operacional
    categories/           # catálogo de categorias
    requirements/         # tipos de documento, matriz e aplicação (RF-030 a RF-038)
    documents/             # upload, versionamento, análise e conformidade (RF-040 a RF-052)
    qualifications/         # rodadas, decisão e bloqueio de aprovação normal (RF-060 a RF-067)
    inspections/            # checklists, programação, execução e evidências (RF-070 a RF-082)
    audit/                # trilha de auditoria (interna e visível ao fornecedor)
  components/
    ui/                   # componentes shadcn/ui (button, input, table...)
    layout/                # sidebar, topbar, nav externa, badges de status
    forms/                 # componentes de formulário compartilhados entre módulos (ex.: ReasonActionButton)
  lib/                    # env, prisma, senha, tokens, rate-limit, mail, storage, tempo, cnpj, validação de arquivo
prisma/
  schema.prisma
  seed.ts
tests/
  unit/                   # Vitest
  e2e/                    # Playwright (inclui fixtures/sample.pdf para upload)
docs/
  REGRAS_FUNCIONAIS.md              # resumo operacional (fonte de verdade)
  ESPECIFICACAO_FUNCIONAL_v0.1_fonte.txt  # especificação completa recebida
  DECISOES_PENDENTES.md             # TODO(decisao-negocio) centralizado
.claude/skills/                     # skills do projeto (ver CLAUDE.md)
```

## Segurança implementada

- Senhas com Argon2id (`@node-rs/argon2`); nunca armazenadas em texto puro.
- Sessão opaca (token aleatório de 256 bits); banco guarda apenas o hash
  SHA-256, nunca o token em claro. Sessão revogável e com expiração
  (`SESSION_TTL_HOURS`).
- Cookie de sessão `HttpOnly`, `Secure` em produção, `SameSite=Lax`.
- Bloqueio de conta após `LOGIN_MAX_ATTEMPTS` tentativas inválidas, por
  `LOGIN_LOCK_MINUTES` minutos (RF-008), persistido no banco.
- Rate limit adicional por e-mail+IP em login e recuperação de senha
  (limitação e critério documentados em `docs/DECISOES_PENDENTES.md`).
- Autorização centralizada em `authorize()` (`src/modules/auth-access/domain/authorize.ts`),
  sempre checada no servidor (Server Actions e páginas), nunca apenas
  ocultando botão na interface. Ações de fornecedor verificam também a posse
  do recurso (`resource.supplierId === actor.supplierId`) para isolamento
  externo (RN-021, CA-03).
- Toda mutação crítica (usuários, permissões, fornecedores, requisitos,
  documentos, qualificação, fiscalizações, situação operacional, login,
  logout) grava `AuditLog` na
  mesma transação; eventos relevantes ao fornecedor ficam marcados
  `visibility: "externa"` e só esses aparecem no histórico do portal
  externo — nunca dados de outro fornecedor nem anotações internas.
- Evidência de fiscalização reaproveita o mesmo storage privado e validação
  de arquivo (assinatura binária) dos documentos; o portal externo só
  enxerga uma fiscalização (e suas evidências) quando ela está concluída —
  buscar por ID uma fiscalização programada, em andamento, cancelada ou de
  outro fornecedor devolve "não encontrado", nunca um erro que revele a
  diferença (RN-021, CA-03).
- Links de definição/redefinição de senha (reaproveitados também para
  convite de fornecedor) são de uso único, expiram em
  `PASSWORD_RESET_TTL_MINUTES` e nunca revelam se um e-mail existe no
  sistema.
- CNPJ é validado por dígito verificador (mod 11) no servidor antes de
  aceitar o cadastro — sem qualquer chamada externa (consulta automática de
  CNPJ está fora do escopo v0.1).
- Upload de documento nunca confia na extensão nem no `Content-Type`
  declarado pelo navegador: o servidor confere a assinatura binária real do
  arquivo (`src/lib/file-validation.ts`) contra PDF/JPG/PNG antes de aceitar,
  além de validar tamanho máximo (`MAX_UPLOAD_SIZE_MB`) e o subconjunto de
  formatos do tipo de requisito.
- Arquivo fica em bucket privado (MinIO/S3) sob uma chave interna aleatória
  (nunca derivada do nome enviado); download só acontece via URL assinada de
  60 segundos, gerada depois de conferir organização e permissão no
  servidor, e o acesso é auditado (RF-118, RNF-003, RNF-004).

## O que ainda não está pronto (limitações honestas desta fatia)

- Não há não conformidade, plano de ação ou dashboard de risco — a
  interface mostra esses itens do menu como "em breve".
- Fiscalização (F5) não cria automaticamente uma não conformidade quando um
  item marcado como "gera NC" é respondido como não conforme — isso é
  metadado preparado para a F6, que ainda não existe. Também não há edição/
  reordenação de item de checklist já criado (só criar novo ou inativar o
  modelo inteiro) nem relatório exportável (RF-081, SHOULD) — a tela de
  detalhe da fiscalização já mostra tudo, só não gera um arquivo separado.
- Programação de fiscalização não valida vínculo com projeto/contrato
  formal (D-08): é texto livre. "Tipo" de fiscalização também é texto
  livre, sem taxonomia fixa (mesmo padrão de criticidade/categoria).
- Qualificação (F4) não tem pareceres separados de Compras e QSMS (RF-062,
  SHOULD) nem comprovante imprimível (RF-067, SHOULD) — só a decisão final.
  Exceção formal de requisito (RF-037, já adiada na F3) continua sem
  implementação, então uma pendência obrigatória só pode virar "aprovado com
  ressalvas" ou "reprovado", nunca "aprovado" normal.
- Não há job agendado de vencimento: "vencendo"/"vencido" são calculados na
  leitura a partir da validade e das janelas de alerta, sempre corretos,
  mas nenhum e-mail proativo é disparado quando um documento entra na
  janela — isso é uma feature de notificação (F7, junto de D-10).
- Exceção/dispensa formal de requisito (RF-037) e atribuição de análise a
  um usuário específico da fila (RF-044) são SHOULD e ficaram fora desta
  fatia — adiadas deliberadamente, não esquecidas.
- Exportação de relação documental (RF-052, SHOULD) não foi implementada.
- Importação em lote de fornecedores (RF-024, SHOULD) e o fornecedor
  convidar seus próprios colaboradores (RF-007, SHOULD) continuam fora do
  escopo (adiadas na F2).
- Edição do cadastro pelo fornecedor após "cadastro validado" não tem um
  fluxo de reabertura dedicado (é preciso Compras inativar e reativar); ver
  justificativa em `docs/DECISOES_PENDENTES.md`.
- Rate limit é em memória por processo (ver `docs/DECISOES_PENDENTES.md`).
- Auditoria interna mostra todos os eventos para os três perfis internos com
  permissão de leitura; segmentação fina por área é um refinamento futuro.
- `npm audit` ainda acusa vulnerabilidades que só têm correção via upgrade
  **major** (Next.js 14 → 16, Vitest 2 → 5). Optamos por não fazer esse
  upgrade por risco de quebra em cima de todo o App Router já implementado;
  as vulnerabilidades remanescentes são de ferramentas de build/dev
  (esbuild/vite do Vitest, bundler interno do Next), não de código exposto
  em produção pela aplicação. Reavaliar antes de produção.

## Próxima fatia recomendada

F6 — Não conformidade e plano de ação: criar `NonConformity` a partir de um
item de fiscalização respondido como não conforme (consumindo o metadado
`generatesNonConformity`/`defaultSeverity` já gravado no snapshot da F5) ou
manualmente por usuário autorizado (RF-090); numeração única anual
(RF-091, ex. NC-2026-0041); plano de ação do fornecedor com causa, ação,
responsável, prazo e evidência (RF-094, reaproveitando o storage privado
já existente); revisão (aceitar/rejeitar/ajustar) por QSMS ou Compras
autorizado (RF-095); verificação e encerramento (RF-096); reabertura
usando a permissão sensível `NC_REOPEN` já concedida no seed (RF-097).
