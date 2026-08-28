# FE-005 — Campanhas e progresso

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-003, BE-009

## Objetivo

Criar campanhas por seleção de contatos e números estruturados, com confirmação,
progresso verdadeiro, pausa e cancelamento conforme permissão.

## Escopo

- Seleção de conversas e entrada por vírgula/quebra de linha.
- Normalização visual, chips, inválidos e deduplicação.
- Revisão de destinatários, conteúdo e anexo antes do início.
- Lista/detalhe/progresso por snapshot + `campaign.progress.v1`.
- Pausar, retomar, cancelar e relatório final.
- Mensagem clara de que intervalo 12–18 s é controlado pelo servidor.

## Requisitos

- **FE005-R01:** frontend não oferece ajuste ou bypass do gate.
- **FE005-R02:** duplo submit usa mesma idempotency key.
- **FE005-R03:** progresso mostra somente estados confirmados.
- **FE005-R04:** contato bloqueado é sinalizado e não incluído como elegível.
- **FE005-R05:** somente ADMIN vê cancelamento de campanha de outro agente.

## Cenários de aceite

```gherkin
Given o mesmo número digitado e selecionado como contato
When a revisão é aberta
Then aparece uma vez e a duplicata é explicada

Given Socket.IO desconecta durante campanha
When reconecta
Then snapshot restaura progresso sem reiniciar ou duplicar a campanha

Given AGENT tenta cancelar campanha de outra AGENT
When executa a ação
Then UI não oferece a ação e backend continua sendo a autoridade
```

## TDD e evidências

Unit tests 100% branches para parser/deduplicação; components de confirmação e
permissão; contrato de progresso; E2E de pause/reconnect/cancel.

## Rollout e rollback

Flag da rota `/app/disparos`. Campanha nova nunca migra para engine legado.
