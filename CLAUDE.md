# Portal de Fiscalização e Gestão de Fornecedores — Lifting

## Missão

Construir um portal interno e externo para cadastro, qualificação, documentação, fiscalização, evidências, não conformidades, planos de ação e histórico auditável de fornecedores.

Leia `docs/REGRAS_FUNCIONAIS.md` antes de alterar domínio, permissões, estados ou fluxos. A especificação funcional v0.1-R1 é a fonte de verdade. Se houver conflito entre uma ideia de implementação e a regra funcional, preserve a regra e registre a decisão pendente.

## Perfis e permissões

Existem somente três perfis-base internos:

- `ADMIN_TI`: contas, perfis, parâmetros, integrações, suporte e auditoria completa. Não toma decisões de negócio por padrão.
- `COMPRAS`: cadastro, convite, categorias, responsáveis, qualificação e acompanhamento gerencial.
- `QSMS`: análise documental, fiscalização, evidências, não conformidades, planos de ação e risco.

Não criar perfis separados de analista documental, fiscal, gestor/aprovador ou auditor/consulta. As funções de decisão sensível são permissões concedidas individualmente a usuários de Compras ou QSMS. Consulta e exportação autorizadas já pertencem a Compras e QSMS.

Perfis externos:

- `FORNECEDOR_ADMIN`: administra usuários e dados permitidos da própria empresa.
- `FORNECEDOR_COLABORADOR`: responde pendências autorizadas da própria empresa.

## Restrições estruturais

- Todo registro de fornecedor é por CNPJ; o CNPJ é único e normalizado.
- Dados, arquivos e consultas do fornecedor devem ser isolados por organização.
- Documentos são versionados; arquivo antigo não é sobrescrito.
- Arquivos são privados e acessados por autorização temporária.
- Estados e decisões críticas mantêm histórico imutável e justificativa.
- Fiscalização é mobile-first e suporta fotos/documentos como evidência.
- Não conformidade nasce vinculada à origem e percorre plano, correção e verificação.
- Nenhum cálculo de score ou bloqueio definitivo deve ser inventado sem regra aprovada.

## Stack padrão gratuita

- Next.js com App Router e TypeScript estrito.
- Tailwind CSS e shadcn/ui.
- PostgreSQL e Prisma ORM.
- Autenticação local segura com senha Argon2id, sessão persistida em banco e cookies seguros.
- Armazenamento privado por interface S3; MinIO no ambiente local.
- Mailpit no ambiente local; adaptador SMTP para implantação futura.
- Zod para validação de entrada.
- Vitest para testes unitários e Playwright para fluxos críticos.
- Docker Compose para aplicação e dependências locais.

Fixe versões estáveis no lockfile. Não adicione dependência paga obrigatória. Integrações externas devem ficar atrás de interfaces e flags de configuração.

## Forma de trabalho

- Implemente em fatias verticais pequenas e executáveis.
- Antes de codificar, inspecione o repositório e proponha um plano curto da fatia atual.
- Não reescreva código funcional sem necessidade demonstrada.
- Use migrations e seeds determinísticos.
- Não coloque segredo, CNPJ real, documento real ou dado pessoal real no repositório.
- Ao concluir uma fatia, rode lint, typecheck, testes e um fluxo de interface relevante.
- Relate arquivos alterados, comandos executados, resultado dos testes, decisões e pendências.

## Skills do projeto

Use as skills de `.claude/skills` conforme a tarefa:

- `arquitetar-stack-free`: bootstrap, Docker, provedores e decisões de custo.
- `guardar-escopo-mvp`: controle de escopo e decisões ainda não aprovadas.
- `modelar-dominio-fornecedores`: banco, invariantes, estados e migrations.
- `implementar-fluxos-qsms`: documentos, fiscalizações, NCs e planos de ação.
- `aplicar-rbac-auditoria`: autorização, isolamento, arquivos, logs e LGPD.
- `verificar-entrega-mvp`: verificação final manual e automatizada da fatia.

