---
name: aplicar-rbac-auditoria
description: Aplica RBAC, permissões sensíveis, isolamento por fornecedor, auditoria e privacidade. Use em autenticação, autorização, uploads, downloads, exportações ou qualquer mutação crítica.
---

# Aplicar acesso e auditoria

## Modelo de autorização

Use perfil-base para o conjunto comum e permissão explícita para ação sensível.

- `ADMIN_TI`: administração técnica; sem decisão de negócio por padrão.
- `COMPRAS`: gestão cadastral e qualificação.
- `QSMS`: documentos, fiscalização, NC e risco.
- Usuários externos: limitados à própria organização.

Não codifique regras somente como `role === ...`. Centralize `authorize(actor, action, resource)` e teste o contexto do recurso.

## Ordem obrigatória de uma mutação

1. Validar entrada.
2. Autenticar sessão.
3. Carregar contexto mínimo do recurso.
4. Autorizar ação e organização.
5. Aplicar transição/invariante.
6. Persistir mudança e auditoria na mesma transação.
7. Retornar apenas campos permitidos.

## Auditoria

Registre ator, ação, entidade, identificador, data UTC, organização, origem, justificativa e antes/depois minimizado. Audite login, falha, logout, permissões, decisão, upload, download sensível, exportação, mudança de estado e reabertura. Nunca grave senha, hash de senha, token, cookie ou conteúdo do documento.

## Arquivos

- Bucket privado.
- Nome físico não deriva diretamente do nome enviado.
- Validar tamanho, extensão permitida, MIME e autorização.
- Gerar URL temporária somente depois de conferir organização e vínculo.
- Manter hash e metadados; negar acesso por referência direta adivinhável.

## Testes negativos obrigatórios

- Fornecedor A não lê nem altera fornecedor B.
- Admin TI sem permissão de negócio não qualifica fornecedor.
- Compras sem permissão sensível não bloqueia.
- QSMS sem vínculo/autorização não encerra fluxo indevido.
- URL expirada ou adulterada não entrega arquivo.
- Exportação respeita filtros e permissões.

