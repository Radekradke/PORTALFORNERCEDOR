---
name: implementar-fluxos-qsms
description: Implementa os fluxos operacionais de QSMS. Use em documentos, análise documental, fiscalização mobile, evidências, não conformidades, planos de ação e verificação.
---

# Implementar fluxos de QSMS

## Princípio

QSMS concentra análise documental e fiscalização. Não crie um perfil para cada função. Compras só atua em uma etapa sensível quando possuir a permissão correspondente.

## Documento

1. Calcule requisitos a partir da categoria/criticidade vigente.
2. Valide metadados e arquivo no servidor.
3. Crie nova versão com hash, autor, data e chave privada.
4. Permita a QSMS aprovar, rejeitar ou pedir correção.
5. Exija justificativa de rejeição e registre validade confirmada.
6. Recalcule pendências sem apagar versões anteriores.

## Fiscalização

1. Programe fornecedor, local/projeto, responsável, data e modelo.
2. Copie o checklist para um snapshot da fiscalização.
3. Na interface mobile, salve progresso de forma explícita e previna envio duplicado.
4. Respostas: conforme, ressalva, não conforme ou não aplicável.
5. Exija justificativa para não aplicável.
6. Evidência registra autor, data, origem, hash e arquivo privado.
7. Conclusão fecha respostas e gera relatório rastreável.

## Não conformidade e plano

1. Crie NC vinculada à origem, com gravidade, responsável e prazo.
2. Fornecedor informa causa, ação corretiva, responsável, prazo e evidência.
3. QSMS ou Compras autorizado aceita, rejeita ou solicita ajuste com justificativa.
4. QSMS verifica correção remota ou presencial.
5. Encerrar ou reabrir sempre gera auditoria.

## Testes essenciais

- QSMS executa o fluxo permitido.
- Usuário sem permissão recebe negação no servidor.
- Fornecedor só responde NC da própria organização.
- Reenvio e rejeição mantêm histórico.
- Atualização concorrente não conclui a mesma fiscalização duas vezes.
- Fluxo funciona em viewport móvel sem perda de campos ou ações.

