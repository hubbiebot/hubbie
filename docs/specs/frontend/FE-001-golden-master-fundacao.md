# FE-001 — Golden Master e fundação Angular

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Tipo:** frontend / fundação

## Objetivo

Caracterizar o painel legado e criar `apps/web` com Angular 22, TypeScript
strict, Tailwind, shell mínimo, feature flags e testes, sem substituir rota.

## Escopo

- Golden Masters determinísticos de login, painel, conversas e administração.
- Workspace Angular em `apps/web`, componentes standalone e lazy routes.
- Signals/facades, RxJS somente em fronteiras assíncronas e Reactive Forms.
- Design tokens, tema claro, Lucide, responsividade e WCAG 2.2 AA.
- Vitest/TestBed, Playwright, fake REST/Socket.IO e fixtures de contrato.
- Adapter do legado isolado e link de retorno a `/legacy`.

## Requisitos

- **FE001-R01:** baseline não depende de WhatsApp, OpenAI, relógio ou rede reais.
- **FE001-R02:** CI nunca atualiza screenshot automaticamente.
- **FE001-R03:** feature administrativa não entra no bundle inicial.
- **FE001-R04:** shared recebe código somente após dois consumidores.
- **FE001-R05:** nenhuma diferença de Golden Master fica sem justificativa.

## Cenários de aceite

```gherkin
Given fixtures, viewport e relógio fixos
When o Golden Master roda duas vezes
Then screenshots, acessibilidade e eventos são idênticos

Given build de produção
When o manifesto é analisado
Then features lazy não aparecem no chunk inicial
```

## TDD e evidências

Primeiro escrever testes de roteamento, feature flag e normalizadores; confirmar
falha; então criar shell/adapter mínimo. Evidências: lint, unit, component, build,
Playwright e manifesto de chunks.

## Rollout e rollback

Nenhuma rota produtiva muda. O Angular é acessível somente a teste interno.
