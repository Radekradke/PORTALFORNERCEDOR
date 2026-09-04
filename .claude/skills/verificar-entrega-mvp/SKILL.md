---
name: verificar-entrega-mvp
description: Verifica uma fatia do MVP antes da entrega. Use ao concluir implementação, preparar revisão, investigar regressão ou declarar uma fase pronta.
---

# Verificar a entrega do MVP

Não declare sucesso com base apenas em leitura de código.

## Preparação

1. Inspecione diff e arquivos não rastreados.
2. Leia os critérios da fatia e identifique o fluxo principal e os acessos negados.
3. Suba o ambiente seguindo o README a partir de dependências limpas quando viável.

## Verificações automáticas

Execute os comandos reais definidos no projeto para:

- instalação reproduzível;
- lint;
- typecheck;
- testes unitários/integração;
- migration em banco vazio;
- seed idempotente;
- build de produção;
- testes Playwright pertinentes.

Não altere teste para esconder defeito. Se um comando não existir, trate como lacuna e proponha o menor acréscimo.

## Verificação funcional

No navegador, exercite o fluxo feliz e ao menos um fluxo de erro. Confira:

- autorização no servidor;
- auditoria da mutação;
- mensagens e estados de carregamento;
- ausência de dados entre organizações;
- viewport desktop e mobile quando houver fiscalização ou formulário externo;
- upload/download privado quando a fatia envolve arquivo.

## Relatório

Informe comando, resultado e evidência observada. Classifique falhas como bloqueantes ou não bloqueantes. Liste limitações honestamente e só marque a fatia pronta quando os critérios objetivos forem atendidos.
