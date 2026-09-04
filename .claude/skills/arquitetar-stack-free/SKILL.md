---
name: arquitetar-stack-free
description: Define e revisa a arquitetura gratuita do projeto. Use em bootstrap, Docker Compose, seleção de bibliotecas, storage, e-mail, autenticação, implantação de demonstração ou análise de custos.
---

# Arquitetar uma base gratuita e substituível

## Objetivo

Manter desenvolvimento e piloto executáveis localmente, sem cartão de crédito ou SaaS obrigatório, preservando caminho seguro para produção.

## Padrão técnico

- Aplicação: Next.js App Router, TypeScript estrito, Tailwind e shadcn/ui.
- Dados: PostgreSQL + Prisma, migrations e seed.
- Arquivos: `StorageProvider` com implementação MinIO/S3 privada.
- E-mail: `MailProvider` com Mailpit local e SMTP futuro.
- Autenticação: credenciais locais seguras, Argon2id e sessão em banco.
- Qualidade: ESLint, typecheck, Vitest e Playwright.
- Ambiente: Docker Compose para dependências.

## Regras de decisão

1. Prefira biblioteca livre, mantida e com licença compatível.
2. Fixe versões no lockfile e evite dependência global não documentada.
3. Isole serviço externo atrás de interface; domínio não importa SDK de provedor.
4. Configure por variáveis de ambiente validadas na inicialização.
5. Forneça valores locais seguros em `.env.example`, nunca segredos reais.
6. Não chame plano gratuito de solução de produção: documente quotas, retenção, backup e riscos.
7. Evite microsserviços, filas e cache distribuído até haver necessidade medida.

## Checklist de bootstrap

- `docker compose up -d` sobe PostgreSQL, MinIO e Mailpit.
- Health checks e volumes têm nomes específicos do projeto.
- Migration e seed funcionam em banco vazio.
- Aplicação falha cedo quando variável obrigatória falta.
- Upload/download privado funciona pelo adaptador local.
- E-mail de recuperação chega ao Mailpit.
- README traz comandos exatos e portas usadas.

Ao propor uma dependência nova, registre problema resolvido, licença, custo inicial, alternativa e plano de substituição.

