---
name: guardar-escopo-mvp
description: Protege o escopo funcional v0.1 do Portal de Fornecedores. Use ao planejar funcionalidades, interpretar pedidos, criar backlog ou decidir se algo pertence ao MVP.
---

# Guardar o escopo do MVP

Leia `CLAUDE.md` e `docs/REGRAS_FUNCIONAIS.md` antes de classificar a demanda.

## Procedimento

1. Reescreva o resultado desejado em uma frase verificável.
2. Classifique cada item como:
   - `MVP`: necessário para os fluxos v0.1;
   - `EXTENSAO`: previsto depois da v0.1;
   - `DECISAO`: depende de regra do negócio;
   - `FORA`: não pertence ao produto atual.
3. Identifique quais perfis, entidades, estados e permissões são afetados.
4. Escolha a menor fatia vertical que entrega valor sem quebrar invariantes.
5. Converta itens `DECISAO` em configuração ou `TODO(decisao-negocio)` centralizado.
6. Não implemente extensão apenas por conveniência técnica.

## Limites que devem ser preservados

- Perfis internos são apenas Admin TI, Compras e QSMS.
- Aprovação/consulta não são perfis separados.
- Score automático definitivo, ERP, OCR/IA, assinatura digital, pagamento, app nativo e modo offline não fazem parte da v0.1.
- Nenhuma regra automática pode bloquear fornecedor antes de a política ser aprovada.
- A primeira versão deve funcionar sem serviço pago obrigatório.

## Saída esperada

Produza uma tabela curta com item, classificação, justificativa e tratamento. Depois proponha critérios de aceite da fatia escolhida.

