---
name: modelar-dominio-fornecedores
description: Modela fornecedores, requisitos, documentos, qualificações, fiscalizações e NCs. Use ao criar schema Prisma, migrations, serviços de domínio, estados ou regras de consistência.
---

# Modelar o domínio de fornecedores

Leia as entidades, estados e invariantes em `docs/REGRAS_FUNCIONAIS.md`.

## Método

1. Defina o agregado e a operação de negócio antes da tabela.
2. Expresse estados com enums controlados e transições em serviço de domínio.
3. Crie restrições no banco quando a invariável puder ser garantida ali.
4. Execute mudança crítica e `AuditLog` na mesma transação.
5. Preserve snapshots quando um modelo editável alimenta um registro histórico.
6. Adicione índices para filtros reais: CNPJ, status, organização, validade, prazo, fornecedor e datas.
7. Escreva testes de transição válida, inválida e concorrência relevante.

## Invariantes

- CNPJ normalizado é único.
- Usuário externo sempre possui organização e nunca cruza seu limite.
- Documento aprovado referencia uma versão imutável.
- Reenvio cria versão, não substitui arquivo.
- Qualificação decidida mantém dados avaliados e decisor(es).
- Fiscalização concluída mantém snapshot do checklist.
- NC tem origem, gravidade, responsável, prazo e histórico.
- Encerramento e reabertura exigem autorização e justificativa.
- Registros históricos não recebem exclusão física comum.

## Entrega de uma alteração de modelo

Inclua migration nomeada, seed idempotente, diagrama ou resumo das relações afetadas, compatibilidade com dados existentes e testes. Não esconda regra de negócio em callback genérico do ORM.

