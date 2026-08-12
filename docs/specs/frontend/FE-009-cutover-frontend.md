# FE-009 — Cutover do frontend

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-008, BE-012

## Objetivo

Promover Angular de `/app` para `/`, manter rollback imediato para `/legacy` e
retirar o frontend legado somente após observação.

## Escopo

- Build versionado servido pelo Nginx/Express com fallback SPA correto.
- Feature flags finais, cache headers e compatibilidade de versão API/frontend.
- Smoke/E2E na VPS, telemetria de erros e critérios de promoção.
- Troca de `/` e preservação temporária de `/legacy` autenticado.
- Remoção posterior e separada de HTML, handlers e assets legados.

## Requisitos

- **FE009-R01:** rollback de rota não exige rebuild nem migration.
- **FE009-R02:** chunks antigos não quebram após deploy (nomes com hash).
- **FE009-R03:** frontend incompatível detecta versão e pede reload controlado.
- **FE009-R04:** `/legacy` e Angular usam a mesma família de refresh e RBAC;
  nenhum deles aceita o antigo `connect.sid`.
- **FE009-R05:** remoção do legado ocorre em release distinta do cutover.

## Cenários de aceite

```gherkin
Given erro acima do limiar após promoção
When operador aciona rollback
Then Nginx retorna `/` ao legado sem perder sessão ou dados

Given logout ou bloqueio executado em qualquer frontend
When o outro frontend ou socket tenta continuar
Then a família está revogada e o acesso é negado

Given aba aberta durante novo deploy
When solicita chunk antigo inexistente
Then oferece reload controlado sem loop ou perda de rascunho evitável

Given janela de observação concluída
When legado é removido em release separada
Then nenhum contrato/asset antigo é referenciado pelo Angular
```

## TDD e evidências

Teste de configuração Nginx, smoke de release/rollback, E2E com aba antiga e
nova, análise de referências e checklist operacional assinado.

## Critério de pronto

Todas as specs FE verificadas, métricas dentro do limite, rollback ensaiado e
paridade/mudanças intencionais documentadas.
