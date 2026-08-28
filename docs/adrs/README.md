# Architecture Decision Records (ADRs)

Esta pasta documenta as decisões arquiteturais do Hubbie. Cada ADR explica o contexto, a decisão tomada, as alternativas consideradas e as consequências.

## ADRs ativos

| ID | Título | Escopo |
|---|---|---|
| [ADR-0001](0001-mvp-simplificado.md) | Escopo Simplificado do MVP | O que entra e sai do MVP |
| [ADR-0002](0002-arquitetura-macro.md) | Arquitetura Macro | Organização dos componentes |
| [ADR-0003](0003-stack-tecnologica.md) | Stack Tecnológica | Justificativas das tecnologias |
| [ADR-0004](0004-autenticacao-sessao.md) | Autenticação e Sessão | JWT, refresh e RBAC |
| [ADR-0005](0005-persistencia-schema.md) | Persistência e Schema | MySQL, TypeORM e criptografia |
| [ADR-0006](0006-mensageria-filas.md) | Mensageria e Filas | BullMQ e jobs assíncronos |
| [ADR-0007](0007-processamento-midia.md) | Processamento de Mídia | Validação, normalização e storage |
| [ADR-0008](0008-deploy-infraestrutura.md) | Deploy e Infraestrutura | VPS, systemd e Nginx |
| [ADR-0009](0009-migracao-cutover.md) | Migração e Cutover | Strangler Fig e importação legada |

## Template para novos ADRs

Ao adicionar um novo ADR, use a numeração sequencial e mantenha a estrutura:

```markdown
# ADR-XXXX — Título

- **Estado:** Proposto / Aprovado / Rejeitado / Superseded
- **Data:** YYYY-MM-DD
- **Decisores:** P.O. do Hubbie
- **Escopo:** Breve descrição

## Contexto

## Decisão

## Alternativas consideradas

## Consequências
```

## Diagramas

Diagramas visuais relacionados aos ADRs estão indexados em [`../diagrams/README.md`](../diagrams/README.md).
