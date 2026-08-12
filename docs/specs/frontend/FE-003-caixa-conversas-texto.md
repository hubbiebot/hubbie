# FE-003 — Caixa compartilhada, conversas e texto

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-002, BE-006, BE-007

## Objetivo

Entregar a caixa compartilhada do único número WhatsApp, histórico paginado e
envio textual com autoria, ordenação e recuperação por REST/Socket.IO.

## Escopo

- Lista/busca/filtros, fixar, arquivar, reabrir, fechar e IA por conversa.
- Timeline paginada/virtualizável com autoria e estados comprovados.
- Compositor textual, rascunho por conversa e idempotency key.
- Bloqueio/desbloqueio de contato com motivo por `AGENT`/`ADMIN`.
- Snapshot REST + eventos versionados e reconexão.
- Prefixo do atendente/Assistente apenas na apresentação confirmada do outbound.

## Requisitos

- **FE003-R01:** evento perdido é corrigido por snapshot/version.
- **FE003-R02:** Enter envia e Shift+Enter quebra linha, com acessibilidade.
- **FE003-R03:** clique repetido não duplica mensagem.
- **FE003-R04:** conteúdo é text binding; nunca `innerHTML` externo.
- **FE003-R05:** contato bloqueado desabilita todos os outbounds e explica razão.
- **FE003-R06:** rascunho persiste ao trocar conversa/reconectar, não após logout.

## Cenários de aceite

```gherkin
Given duas AGENTs na mesma conversa
When ambas enviam mensagens
Then a timeline mostra ordem do servidor e nome correto de cada autora

Given reconnect com eventos perdidos
When o snapshot possui aggregateVersion maior
Then a facade substitui/reconcilia estado sem duplicar mensagens

Given contato bloqueado
When AGENT tenta enviar
Then compositor impede submissão e oferece desbloqueio autorizado
```

## TDD e evidências

Unit tests de reducer/facade/ordering, component tests de teclado/foco/estados,
contract tests de eventos e Playwright multiusuário.

## Rollout e rollback

Rota `/app/conversas` sob flag; `/legacy` permanece disponível.
