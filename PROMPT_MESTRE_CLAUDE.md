# Prompt mestre para o Claude Code

Você está trabalhando no repositório do **Portal de Fiscalização e Gestão de Fornecedores da Lifting**. Sua missão é implementar um MVP utilizável, seguro e auditável, com dois ambientes: portal interno e portal do fornecedor.

Antes de alterar qualquer arquivo:

1. Inspecione a estrutura e o estado do Git.
2. Leia integralmente `CLAUDE.md` e `docs/REGRAS_FUNCIONAIS.md`.
3. Descubra as skills em `.claude/skills` e use, nesta ordem, as que forem relevantes para a fatia atual:
   - `/guardar-escopo-mvp`
   - `/arquitetar-stack-free`
   - `/modelar-dominio-fornecedores`
   - `/aplicar-rbac-auditoria`
   - `/implementar-fluxos-qsms`
   - `/verificar-entrega-mvp` ao concluir
4. Informe em até dez itens o que encontrou, o que aproveitará e qual será a primeira fatia vertical.
5. Depois do plano curto, implemente a primeira fatia sem ficar apenas na análise.

## Resultado de produto esperado

O sistema deve transformar o fornecedor em um prontuário corporativo rastreável:

`convite -> cadastro -> requisitos -> documentos -> qualificação -> fiscalização -> não conformidade -> plano de ação -> verificação -> histórico`

O dashboard deve priorizar risco e ação: documentos vencidos ou próximos do vencimento, cadastros pendentes, fiscalizações programadas, NCs abertas/atrasadas e fornecedores com restrição.

## Perfis obrigatórios

Crie somente estes perfis-base internos:

- `ADMIN_TI`: gerencia usuários, permissões, configurações, integrações e auditoria. Não aprova documento nem toma decisão de negócio por padrão.
- `COMPRAS`: cadastra/convida fornecedores, define categoria e criticidade proposta, vincula responsáveis, acompanha qualificação, consulta e exporta.
- `QSMS`: analisa documentos, programa/executa fiscalizações, trata evidências, NCs, planos de ação e risco, consulta e exporta.

Não crie perfis separados para analista documental, fiscal, gestor/aprovador ou auditor/consulta. Modele decisões sensíveis como permissões individuais concedidas a usuários de `COMPRAS` ou `QSMS`, incluindo qualificar, aprovar com ressalva, reprovar, suspender, bloquear, desbloquear, aceitar exceção e reabrir NC.

No portal externo use `FORNECEDOR_ADMIN` e `FORNECEDOR_COLABORADOR`, sempre isolados pela organização/CNPJ.

## Stack técnica obrigatória para o início gratuito

Use componentes que funcionem localmente e não exijam contratação:

- Next.js App Router + TypeScript em modo estrito.
- Tailwind CSS + shadcn/ui, interface em português do Brasil.
- PostgreSQL + Prisma ORM, migrations versionadas e seed idempotente.
- Autenticação local com e-mail/senha, Argon2id, sessão persistida em banco e cookies seguros.
- Interface `StorageProvider`; implementação local privada usando MinIO/S3.
- Interface `MailProvider`; Mailpit no desenvolvimento e SMTP configurável no futuro.
- Zod para validar todas as entradas do servidor.
- Vitest para domínio/serviços e Playwright para fluxos essenciais.
- Docker Compose para banco, MinIO e Mailpit; aplicação executável com comandos documentados.
- ESLint, formatação, typecheck e lockfile versionado.

Escolha versões estáveis e compatíveis, fixe-as no lockfile e registre a decisão. Nenhuma funcionalidade central pode depender de API paga, cartão de crédito, trial, IA externa ou SaaS proprietário. Serviços gratuitos em nuvem são opcionais para demonstração, não pressupostos do código. Crie adaptadores para futura troca de banco, storage, e-mail e autenticação corporativa sem implementar integrações futuras agora.

## Diretrizes arquiteturais

Comece como monólito modular. Separe apresentação, autorização, aplicação/domínio e infraestrutura sem transformar o MVP em microsserviços.

Estruture módulos coerentes, por exemplo:

- `auth-access`
- `users-permissions`
- `suppliers`
- `categories-requirements`
- `documents`
- `qualifications`
- `inspections`
- `nonconformities`
- `notifications`
- `audit`

Regras de negócio críticas devem estar em serviços testáveis, não escondidas em componentes React nem espalhadas em rotas. Toda mutação deve validar entrada, autenticar, autorizar, aplicar invariantes, persistir em transação e registrar auditoria.

## Modelo e regras essenciais

- Fornecedor é único por CNPJ normalizado.
- Documentos possuem versões imutáveis; reenvio não sobrescreve arquivo.
- Arquivos são privados, possuem hash e metadados e só são acessados após autorização no servidor.
- Qualificação mantém resultado, justificativa, decisor(es), data e snapshot dos requisitos/documentos avaliados.
- Fiscalização usa modelo versionado ou snapshot do checklist para que mudanças futuras não alterem inspeção concluída.
- Item não aplicável exige justificativa.
- NC mantém vínculo com fiscalização, documento ou origem manual.
- Plano de ação registra causa, ação corretiva, responsável, prazo e evidência.
- Encerramento/reabertura de NC é auditado.
- Não apague histórico de negócio; use inativação ou exclusão lógica onde aplicável.
- Datas ficam em UTC e são exibidas no fuso configurado.
- Use paginação, filtros e índices nas listagens principais.

## Segurança mínima inegociável

- Hash de senha Argon2id; nunca armazene senha ou token em texto puro.
- Sessões revogáveis e rotação/expiração segura.
- Cookies seguros e proteção CSRF nas mutações autenticadas.
- Rate limit no login, recuperação e endpoints abusáveis.
- Autorização por ação e recurso sempre no servidor; ocultar botão não é controle de acesso.
- Isolamento forte de organização para usuários externos.
- Download privado com autorização e URL temporária.
- Limites de extensão, MIME e tamanho no upload; nome de arquivo não determina o tipo.
- Logs sem segredos ou conteúdo sensível; auditoria registra ator, ação, entidade, data, contexto e antes/depois minimizado.
- Seeds usam empresas e pessoas fictícias claramente marcadas.

## Experiência de uso

- Layout interno com dashboard, fornecedores, documentos, fiscalizações, NCs, notificações, configurações e auditoria conforme permissão.
- Portal externo simples: início/pendências, empresa, documentos, qualificação, fiscalizações, NCs/planos, notificações, usuários e histórico permitido.
- Formulários com rótulo, ajuda, erro acionável, estado de carregamento e prevenção de envio duplicado.
- Fiscalização mobile-first: alvos de toque adequados, captura/anexo de evidência, progresso persistido e retomada segura enquanto houver conexão. Modo offline está fora do MVP.
- Acessibilidade: navegação por teclado, foco visível, contraste adequado, semântica e mensagens associadas aos campos.

## Sequência de implementação

Trabalhe em fatias verticais. Não tente implementar todo o produto em um único lote.

### F0 — Fundação

- Scaffold, configuração, Docker Compose, variáveis de ambiente documentadas.
- PostgreSQL, Prisma, MinIO e Mailpit funcionando localmente.
- Layout base, tratamento de erro, logging seguro e health check.

### F1 — Acesso e autorização

- Usuários, perfis-base, permissões sensíveis e seed fictício.
- Login, logout, sessão, recuperação local de senha e bloqueio de acesso.
- Guards server-side e testes de matriz de acesso.
- Auditoria de login, falha, logout e gestão de permissões.

### F2 — Fornecedores

- Convite, pré-cadastro, CNPJ único, contatos, categorias, criticidade e responsáveis.
- Portal externo isolado por fornecedor.
- Histórico das mudanças críticas.

### F3 — Requisitos e documentos

- Matriz de requisitos por categoria/criticidade.
- Upload privado, versionamento, análise QSMS, validade e alertas internos.

### F4 — Qualificação

- Processo, pareceres, permissões de decisão, resultado e ressalvas.
- Snapshot e trilha auditável.

### F5 — Fiscalização

- Modelos, programação, checklist responsivo e evidências.
- Conclusão com relatório rastreável.

### F6 — NC e plano de ação

- Criação, resposta do fornecedor, análise, correção, verificação, encerramento e reabertura.

### F7 — Operação

- Dashboard, notificações, filtros, exportações autorizadas e refinamento de auditoria.

Se o repositório estiver vazio, implemente **F0 e uma versão funcional de F1** nesta sessão. Se já houver código, identifique a menor fatia incompleta de maior prioridade e implemente-a. Não avance de fase escondendo falhas da anterior.

## Decisões pendentes

Não invente fórmula de score, SLA final, regras automáticas de bloqueio, matriz documental real, critérios definitivos de criticidade ou política de decisão conjunta. Modele pontos de extensão/configuração e registre cada pendência como `TODO(decisao-negocio): D-XX ...` em local central, sem espalhar condicionais provisórias.

## Critérios de entrega de cada fatia

Considere a fatia concluída somente quando:

1. O fluxo principal pode ser executado pela interface.
2. Autorização é validada no servidor e há teste negativo de acesso.
3. Mutação crítica gera auditoria.
4. Migration e seed funcionam a partir de banco vazio.
5. Lint, typecheck e testes passam.
6. O fluxo crítico é verificado no navegador em viewport desktop e, quando aplicável, mobile.
7. README contém comandos exatos para instalar, configurar, migrar, semear, executar e testar.
8. Não existem segredos, serviços pagos obrigatórios ou dados reais no repositório.

## Formato da sua resposta ao terminar

Entregue um resumo objetivo com:

- fatia implementada;
- arquivos e módulos principais;
- comandos de execução;
- testes executados e resultados;
- decisões tomadas;
- pendências de negócio;
- riscos ou limitações reais;
- próxima fatia recomendada.

Comece agora: inspecione o repositório, leia o contexto e implemente a primeira fatia apropriada.

