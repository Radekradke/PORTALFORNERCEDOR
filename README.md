# Portal de Fiscalização e Gestão de Fornecedores — Lifting

Portal interno e portal do fornecedor para transformar o fornecedor em um
prontuário corporativo rastreável: convite → cadastro → requisitos →
documentos → qualificação → fiscalização → não conformidade → plano de ação
→ verificação → histórico.

A fonte de verdade das regras de negócio é `docs/REGRAS_FUNCIONAIS.md` (e o
documento completo em `docs/ESPECIFICACAO_FUNCIONAL_v0.1_fonte.txt`). Leia
também `CLAUDE.md` antes de alterar domínio, permissões, estados ou fluxos.

## Status desta entrega

**Fatia implementada: F0 (Fundação) + F1 (Acesso e autorização).**

Inclui: scaffold Next.js/TypeScript/Tailwind, Docker Compose
(PostgreSQL + MinIO + Mailpit), schema Prisma inicial, autenticação local
(Argon2id), sessão em banco, recuperação/definição de senha por e-mail,
bloqueio de conta por tentativas inválidas, gestão de usuários internos
(Admin TI, Compras, QSMS), permissões sensíveis individuais, guards
server-side e trilha de auditoria.

Fornecedores, documentos, qualificação, fiscalização, NC e dashboard de
risco **ainda não existem** — entram nas fatias F2 a F7 (ver
`PROMPT_MESTRE_CLAUDE.md`). O menu do portal interno já mostra a
arquitetura de informação completa da especificação, com os itens ainda não
implementados marcados como "em breve" (não são links falsos).

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

| Perfil | E-mail | Senha |
|---|---|---|
| Admin TI | `admin.ti@lifting.local` | `AdminTi#2026Local` |
| Compras | `compras@lifting.local` | `Compras#2026Local` |
| QSMS | `qsms@lifting.local` | `Qsms#2026Local` |
| Compras (bloqueado, para testar desbloqueio) | `compras.bloqueado@lifting.local` | `Bloqueado#2026Local` |
| QSMS (convite pendente, sem senha ainda) | `qsms.convite@lifting.local` | — (use "Esqueci minha senha" ou veja o e-mail no Mailpit) |

### Ferramentas locais

- Aplicação: http://localhost:3000
- Mailpit (caixa de e-mail de desenvolvimento): http://localhost:8025
- MinIO Console (armazenamento privado): http://localhost:9001 (usuário/senha em `docker-compose.yml`)
- Health check: http://localhost:3000/api/health

## Comandos de verificação

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript estrito
npm run test        # Vitest (unitários — authorize(), senha, tokens, rate limit)
npm run build       # build de produção

# Testes de ponta a ponta (requer app rodando em http://localhost:3000
# e banco semeado com prisma:seed)
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
    (internal)/           # dashboard, usuários, auditoria — exige sessão
    api/health/           # health check
  modules/                # domínio/serviços por módulo coerente
    auth-access/          # login, sessão, recuperação de senha, authorize()
    users-permissions/     # usuários internos e permissões sensíveis
    audit/                # trilha de auditoria
  components/
    ui/                   # componentes shadcn/ui (button, input, table...)
    layout/                # sidebar, topbar, navegação
  lib/                    # env, prisma, senha, tokens, rate-limit, mail, storage, tempo
prisma/
  schema.prisma
  seed.ts
tests/
  unit/                   # Vitest
  e2e/                    # Playwright
docs/
  REGRAS_FUNCIONAIS.md              # resumo operacional (fonte de verdade)
  ESPECIFICACAO_FUNCIONAL_v0.1_fonte.txt  # especificação completa recebida
  DECISOES_PENDENTES.md             # TODO(decisao-negocio) centralizado
.claude/skills/                     # skills do projeto (ver CLAUDE.md)
```

## Segurança implementada nesta fatia

- Senhas com Argon2id (`@node-rs/argon2`); nunca armazenadas em texto puro.
- Sessão opaca (token aleatório de 256 bits); banco guarda apenas o hash
  SHA-256, nunca o token em claro. Sessão revogável e com expiração
  (`SESSION_TTL_HOURS`).
- Cookie de sessão `HttpOnly`, `Secure` em produção, `SameSite=Lax`.
- Bloqueio de conta após `LOGIN_MAX_ATTEMPTS` tentativas inválidas, por
  `LOGIN_LOCK_MINUTES` minutos (RF-008), persistido no banco.
- Rate limit adicional por e-mail+IP em login e recuperação de senha
  (limitação documentada em `docs/DECISOES_PENDENTES.md`).
- Autorização centralizada em `authorize()` (`src/modules/auth-access/domain/authorize.ts`),
  sempre checada no servidor (Server Actions e páginas), nunca apenas
  ocultando botão na interface.
- Toda mutação crítica (criar/bloquear/desbloquear usuário, conceder/revogar
  permissão sensível, login, logout) grava `AuditLog` na mesma transação.
- Links de definição/redefinição de senha são de uso único, expiram em
  `PASSWORD_RESET_TTL_MINUTES` e nunca revelam se um e-mail existe no
  sistema.

## O que ainda não está pronto (limitações honestas desta fatia)

- Não há cadastro de fornecedor, documentos, fiscalização, NC ou dashboard
  de risco — a interface mostra esses itens do menu como "em breve".
- Perfis externos (`FORNECEDOR_ADMIN`/`FORNECEDOR_COLABORADOR`) existem no
  schema e no `authorize()`, mas nenhum fluxo do portal externo foi
  implementado ainda (entra na fatia F2).
- `StorageProvider` (MinIO/S3) está implementado como infraestrutura pronta,
  mas ainda não é usado por nenhuma tela — é a base para a fatia F3
  (documentos).
- Rate limit é em memória por processo (ver `docs/DECISOES_PENDENTES.md`).
- Auditoria mostra todos os eventos para os três perfis internos com
  permissão de leitura; segmentação fina por área é um refinamento futuro.
- `npm audit` ainda acusa vulnerabilidades que só têm correção via upgrade
  **major** (Next.js 14 → 16, Vitest 2 → 5). Optamos por não fazer esse
  upgrade nesta fatia por risco de quebra em cima de todo o App Router
  recém-implementado; as vulnerabilidades remanescentes são de ferramentas
  de build/dev (esbuild/vite do Vitest, bundler interno do Next), não de
  código exposto em produção pela aplicação. Reavaliar antes de produção.

## Próxima fatia recomendada

F2 — Fornecedores: convite, pré-cadastro por CNPJ (único e normalizado),
contatos, categorias, criticidade, responsáveis internos e isolamento do
portal externo por organização, usando a base de `Organization` já criada
no schema desta fatia.
