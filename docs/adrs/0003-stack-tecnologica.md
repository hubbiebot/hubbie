# ADR-0003 — Stack Tecnológica

- **Estado:** Aprovado
- **Data:** 2026-08-20
- **Decisores:** P.O. do Hubbie
- **Escopo:** Justifica as escolhas tecnológicas do MVP

## Backend

### Node.js LTS + Express 5 + JavaScript ESM

**Por quê:**
- O legado já é Node/Express; reduz curva de aprendizado.
- Express 5 trata erros assíncronos automaticamente.
- ESM é o padrão moderno do Node.js.

**Por que não NestJS:**
- Adiciona decorators, DI container e complexidade desnecessária para o tamanho do time.
- A curva de aprendizado não compensa no MVP.

**Por que não TypeScript no backend:**
- Menor complexidade de build.
- Time familiarizado com JavaScript.
- TypeORM EntitySchema oferece tipagem suficiente para o banco.

### MySQL 8

**Por quê:**
- Banco relacional maduro, com transações, locks e constraints.
- Fonte da verdade única e durável.
- Facilidade de hospedagem em VPS.

**Por que não SQLite:**
- Evita migração futura quando o produto crescer.
- Melhor concorrência para filas e múltiplos workers.

**Por que não PostgreSQL:**
- MySQL é suficiente e mais familiar ao time.
- Menor overhead operacional no ambiente atual.

### Redis 7

**Por quê:**
- Sessões distribuídas e rate limiting.
- Fila BullMQ.
- Pub/Sub do Socket.IO.

**Por que não RabbitMQ/Kafka:**
- Overkill para o volume do MVP.
- Redis já atende filas + Pub/Sub + cache.

### BullMQ

**Por quê:**
- Filas persistentes em Redis.
- Delayed jobs, retries, concorrência controlada.
- Ótima integração com Node.js.

## Frontend

### Angular 22 + PrimeNG

**Por quê:**
- Decisão de negócio mandatória.
- Angular oferece estrutura, lazy loading e Signals.
- PrimeNG acelera entrega com componentes prontos.

**Simplificações:**
- Tema padrão do PrimeNG, sem design system profundo no MVP.
- Sem SSR/PWA.
- Lazy loading por feature.

## Testes

- **Backend:** Vitest + Supertest.
- **Frontend:** Vitest/TestBed + Playwright para E2E.

## Segurança

- **Senhas:** Argon2id.
- **Tokens:** JWT RS256 + refresh opaco.
- **Validação:** JSON Schema com Ajv.

## Consequências

**Positivas:**
- Stack coesa e familiar.
- Produtividade alta no curto prazo.
- Fácil contratação e manutenção.

**Negativas:**
- Menos rigidez de tipos no backend comparado a TypeScript.
- PrimeNG pode aumentar o bundle; mitigar com lazy loading.
