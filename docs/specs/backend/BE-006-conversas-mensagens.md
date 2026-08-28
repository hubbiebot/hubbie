# BE-006 — Conversas e mensagens

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Depende de:** BE-002, BE-004

## Objetivo

Persistir contatos, caixa compartilhada, conversas e mensagens com autorização,
ordenação, autoria e exclusão segura, ainda sem possuir a sessão WhatsApp.

## Escopo

- REST para listar/buscar contatos, conversas e histórico paginado por cursor.
- Criação de mensagem outbound em estado `SCHEDULED` e ingestão inbound.
- Sequências monotônicas `inbound_seq`/`outbound_seq` por conversa.
- Autoria: `sent_by_user_id`, papel e snapshot do nome.
- Arquivar/reabrir/fechar, fixar por usuário e pausar IA.
- Bloqueio e `automation_epoch` para invalidar IA pendente.
- Exclusão 202 por job, invisibilidade imediata e tombstone.

## Requisitos

- **BE006-R01:** histórico é persistente e não possui expiração automática.
- **BE006-R02:** IDs do provedor e idempotency keys impedem duplicação.
- **BE006-R03:** conteúdo cifrado nunca entra em logs/auditoria.
- **BE006-R04:** `ADMIN`/`AGENT` excluem; `SUPPORT` recebe 403.
- **BE006-R05:** mensagem humana e IA mantêm conteúdo separado do prefixo visual.
- **BE006-R06:** paginação é estável sob inserções concorrentes.

## Estados de outbound

`SCHEDULED → QUEUED → PROCESSING → SENT | FAILED | CANCELED | UNKNOWN`.

## Cenários de aceite

```gherkin
Given duas mensagens concorrentes na mesma conversa
When são persistidas
Then recebem sequências distintas e ordem determinística

Given uma resposta de IA pendente
When um humano responde ou bloqueia o contato
Then o automation_epoch muda e a resposta antiga não pode ser enviada

Given exclusão confirmada por AGENT
When a API responde 202
Then conteúdo fica invisível imediatamente e o job pode ser repetido sem erro
```

## Testes obrigatórios

Concorrência/sequência, cursor, deduplicação, autorização por objeto, cifragem,
invalidação de IA e exclusão idempotente.

## Rollout e rollback

Primeiro opera em shadow com tráfego sintetizado. Promoção de leitura depende
de paridade e de o legado obter snapshots pela API.
