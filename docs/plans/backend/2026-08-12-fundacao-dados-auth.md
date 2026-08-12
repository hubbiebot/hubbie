# Fundação, Dados e Autenticação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a fundação Express 5, MySQL/criptografia/importação, JWT/refresh, usuários/auditoria e a primeira migração Strangler dos dados JSON.

**Architecture:** Monólito modular MVC em JavaScript ESM. MySQL é autoritativo após promoção por recurso; Redis fornece cache-aside e rate limiting. O `index.js` legado permanece executando e usa adaptadores somente depois de cada fatia passar pelos gates.

**Tech Stack:** Node.js LTS, Express 5, JavaScript ESM, TypeORM EntitySchema, MySQL 8, Redis 7/ioredis, Ajv, jose, argon2, Pino, Vitest e Supertest.

## Global Constraints

- Basear o trabalho em `dev`, numa branch/worktree `feat/<spec>-descricao`.
- Não mover nem reescrever `index.js`, HTML ou JSONs antes da promoção da fatia.
- JavaScript ESM; sem NestJS, TypeScript backend, decorators ou DI container.
- Controllers finos, regras/transações em Services e SQL específico em Repositories.
- MySQL é fonte da verdade; Redis pode ser apagado sem mudar o resultado.
- Access JWT RS256 dura exatamente 20 minutos; refresh fica somente em cookie HttpOnly.
- Nunca registrar segredo, token, prompt, mensagem, telefone ou nome completo.
- Cada comportamento segue Red → Green → Refactor e termina em commit pequeno.
- Specs: `docs/specs/backend/BE-001` a `BE-005` devem estar `APPROVED` antes da task correspondente.

## Mapa de arquivos

```text
package.json                         workspaces e scripts de orquestração
apps/api/src/app.js                  composição Express sem abrir porta
apps/api/src/server.js               lifecycle HTTP e shutdown
apps/api/src/modules/*               MVC por domínio
apps/api/test/*                      integração HTTP
packages/database/src/*              DataSource, EntitySchemas e migrations
packages/contracts/openapi/*         OpenAPI 3.1 e schemas Ajv
packages/shared/src/config/*          configuração fail-fast
packages/shared/src/security/*        JWT, senha e field crypto
packages/shared/src/logging/*         Pino/redaction
```

---

### Task 1: BE-001 — Fundação Express observável

**Files:**
- Modify: `package.json`
- Create: `apps/api/package.json`
- Create: `apps/api/src/app.js`
- Create: `apps/api/src/server.js`
- Create: `apps/api/src/middlewares/error-handler.js`
- Create: `apps/api/src/modules/health/health.routes.js`
- Create: `packages/shared/src/config/load-config.js`
- Create: `packages/shared/src/logging/logger.js`
- Test: `apps/api/test/health.test.js`
- Test: `apps/api/test/error-handler.test.js`

**Interfaces:**
- Produces: `createApp({ config, logger, readiness }) -> Express`
- Produces: `loadConfig(source) -> Readonly<AppConfig>`
- Produces: `problemDetails(error, requestId) -> object`

- [ ] **Step 1: escrever o primeiro teste falhando**

```js
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /health/live', () => {
  it('retorna vida sem depender de MySQL ou Redis', async () => {
    const app = createApp({
      config: { env: 'test', allowedOrigins: ['https://app.test'] },
      logger: { info() {}, error() {}, child() { return this; } },
      readiness: async () => ({ mysql: false, redis: false }),
    });
    const response = await request(app).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: executar e confirmar Red**

Run: `npm run test -w apps/api -- health.test.js`

Expected: FAIL por `apps/api/src/app.js` inexistente.

- [ ] **Step 3: criar a composição mínima**

```js
// apps/api/src/app.js
import express from 'express';

export function createApp({ config, logger, readiness }) {
  const app = express();
  app.disable('x-powered-by');
  app.locals.config = config;
  app.locals.logger = logger;
  app.locals.readiness = readiness;
  app.get('/health/live', (_request, response) => response.json({ status: 'ok' }));
  return app;
}
```

- [ ] **Step 4: ampliar testes antes de middleware/config**

Adicionar em `error-handler.test.js` casos para JSON maior que 256 KB, erro
assíncrono, `requestId` e ausência de stack. Rodar e confirmar que cada caso
falha pelo motivo esperado.

- [ ] **Step 5: implementar o mínimo e refatorar**

Compor `express.json({ limit: '256kb' })`, request ID, Helmet, CORS por igualdade
exata, router de health e error middleware RFC 9457. `loadConfig()` deve rejeitar
campo ausente ou URL inválida antes de abrir porta.

- [ ] **Step 6: verificar a task**

Run: `npm run lint && npm run test -w apps/api && npm run test -w packages/shared`

Expected: PASS; logs de teste não contêm stack ou valores de fixtures sensíveis.

- [ ] **Step 7: commit**

```bash
git add package.json package-lock.json apps/api packages/shared
git commit -m "feat(BE-001): establish Express foundation"
```

---

### Task 2: BE-002 — DataSource, schema e field crypto

**Files:**
- Create: `packages/database/src/data-source.js`
- Create: `packages/database/src/entities/user.entity.js`
- Create: `packages/database/src/entities/refresh-token.entity.js`
- Create: `packages/database/src/entities/contact.entity.js`
- Create: `packages/database/src/entities/conversation.entity.js`
- Create: `packages/database/src/entities/message.entity.js`
- Create: `packages/database/src/entities/media-object.entity.js`
- Create: `packages/database/src/entities/product.entity.js`
- Create: `packages/database/src/entities/inventory-movement.entity.js`
- Create: `packages/database/src/entities/reminder.entity.js`
- Create: `packages/database/src/entities/campaign.entity.js`
- Create: `packages/database/src/entities/campaign-recipient.entity.js`
- Create: `packages/database/src/entities/async-job.entity.js`
- Create: `packages/database/src/entities/task-outbox.entity.js`
- Create: `packages/database/src/entities/domain-event-outbox.entity.js`
- Create: `packages/database/src/entities/audit-event.entity.js`
- Create: `packages/database/src/entities/legacy-import-run.entity.js`
- Create: `packages/database/src/migrations/1786579200000-initial-schema.js`
- Create: `packages/shared/src/security/field-crypto.js`
- Create: `packages/shared/src/security/blind-index.js`
- Test: `packages/database/test/migrations.integration.test.js`
- Test: `packages/shared/test/field-crypto.test.js`

**Interfaces:**
- Produces: `createDataSource(config) -> DataSource`
- Produces: `encryptField({ plaintext, aad, keyVersion }) -> { ciphertext, iv, tag, keyVersion }`
- Produces: `decryptField(envelope, aad) -> string`
- Produces: `blindIndex(canonicalValue) -> hex`

- [ ] **Step 1: escrever teste de adulteração antes da cifra**

```js
it('falha se o AAD não pertence ao registro', () => {
  const envelope = crypto.encryptField({
    plaintext: '5511999999999',
    aad: 'installation-1:contacts:phone:contact-1',
    keyVersion: 1,
  });
  expect(() => crypto.decryptField(
    envelope,
    'installation-1:contacts:phone:contact-2',
  )).toThrow('AUTHENTICATION_FAILED');
});
```

- [ ] **Step 2: executar e confirmar Red**

Run: `npm run test -w packages/shared -- field-crypto.test.js`

Expected: FAIL porque `field-crypto.js` não existe.

- [ ] **Step 3: implementar AES-256-GCM mínimo**

Usar `node:crypto`, IV aleatório de 12 bytes, auth tag de 16 bytes e key resolver
por versão. O código deve aceitar chaves somente por dependência injetada; nunca
ler variável de ambiente dentro da função de domínio.

- [ ] **Step 4: escrever migration test antes do schema**

O teste sobe banco indicado por `TEST_DATABASE_URL`, executa migrations, verifica
FKs/uniques/checks de `users`, `products`, `contacts`, `messages`, outboxes e faz
rollback completo em banco vazio.

- [ ] **Step 5: criar EntitySchemas e migration explícita**

Usar `EntitySchema` JavaScript. Não usar `synchronize`. Incluir collation
`utf8mb4_0900_ai_ci`, timestamps UTC, índices cegos únicos e constraints da
SPEC-000.

- [ ] **Step 6: verificar**

Run: `npm run test -w packages/shared && npm run test:integration -w packages/database`

Expected: round-trip, tamper, blind index, migration up/down verdes.

- [ ] **Step 7: commit**

```bash
git add packages/database packages/shared package-lock.json
git commit -m "feat(BE-002): add encrypted MySQL schema"
```

---

### Task 3: BE-002 — Importador idempotente dos JSONs

**Files:**
- Create: `apps/api/src/cli/import-legacy.js`
- Create: `apps/api/src/modules/legacy-import/legacy-import.service.js`
- Create: `apps/api/src/modules/legacy-import/legacy-json.schemas.js`
- Create: `apps/api/test/fixtures/legacy/products.json`
- Create: `apps/api/test/fixtures/legacy/contacts.json`
- Create: `apps/api/test/fixtures/legacy/messages.json`
- Create: `apps/api/test/fixtures/legacy/malformed.json`
- Test: `apps/api/test/legacy-import.integration.test.js`

**Interfaces:**
- Produces: `importLegacySnapshot({ directory, mode }) -> ImportReport`
- `ImportReport`: `{ manifestHash, status, counts, warnings }`

- [ ] **Step 1: teste falhando de repetição**

```js
it('transforma o segundo import do mesmo manifesto em no-op', async () => {
  const first = await importer.importLegacySnapshot({ directory: fixtureDir, mode: 'shadow' });
  const second = await importer.importLegacySnapshot({ directory: fixtureDir, mode: 'shadow' });
  expect(first.status).toBe('IMPORTED');
  expect(second.status).toBe('ALREADY_IMPORTED');
  expect(await countRows('inventory_movements')).toBe(3);
});
```

- [ ] **Step 2: executar Red**

Run: `npm run test:integration -w apps/api -- legacy-import.integration.test.js`

Expected: FAIL por importer inexistente.

- [ ] **Step 3: implementar validação antes de transação**

Ler os seis arquivos, calcular SHA-256, validar Ajv, converter preço pt-BR e
rejeitar o snapshot inteiro antes de adquirir lock se houver erro.

- [ ] **Step 4: implementar lock/transação/relatório mínimo**

Usar `GET_LOCK`, `legacy_import_runs(manifest_hash UNIQUE)` e item hashes. Criar
stubs de contatos pela união das fontes e `OPENING_BALANCE` por produto.

- [ ] **Step 5: adicionar casos de falha**

Cobrir JSON inválido, preço/data inválidos, lock concorrente, manifesto alterado,
ausência que não deleta e rollback por erro no último item.

- [ ] **Step 6: verificar e commit**

Run: `npm run test:integration -w apps/api -- legacy-import.integration.test.js`

```bash
git add apps/api/src/cli apps/api/src/modules/legacy-import apps/api/test
git commit -m "feat(BE-002): import legacy JSON idempotently"
```

---

### Task 4: BE-003 — JWT, refresh e bootstrap

**Files:**
- Create: `apps/api/src/modules/auth/auth.routes.js`
- Create: `apps/api/src/modules/auth/auth.controller.js`
- Create: `apps/api/src/modules/auth/auth.service.js`
- Create: `apps/api/src/modules/auth/auth.repository.js`
- Create: `apps/api/src/modules/auth/auth.schemas.js`
- Create: `packages/shared/src/security/jwt-service.js`
- Create: `packages/shared/src/security/password-service.js`
- Test: `apps/api/test/auth.integration.test.js`
- Test: `packages/shared/test/jwt-service.test.js`

**Interfaces:**
- Produces: `authenticate(username, password, context) -> AuthResult`
- Produces: `rotateRefreshToken(rawToken, context) -> AuthResult`
- Produces: middleware `requireAccessToken(request, response, next)`

- [ ] **Step 1: teste falhando do contrato de login**

```js
expect(response.body).toMatchObject({
  expiresIn: 1200,
  session: { user: { role: 'ADMIN' }, permissions: expect.any(Array) },
});
expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
expect(response.headers['set-cookie'][0]).toContain('SameSite=Strict');
```

- [ ] **Step 2: executar Red**

Run: `npm run test:integration -w apps/api -- auth.integration.test.js`

Expected: 404 em `/api/v1/auth/login`.

- [ ] **Step 3: implementar login mínimo**

Validar schema, rate limit IP+identidade, Argon2id, `must_change_credentials`,
RS256 com `iss/aud/authVersion/jti`, refresh aleatório e hash no banco.

- [ ] **Step 4: escrever teste de reuse antes de refresh**

Fazer login, rotacionar uma vez, reutilizar cookie anterior e esperar 401, família
revogada e `auth.revoked` na outbox.

- [ ] **Step 5: implementar rotação/revogação single transaction**

Bloquear linha/família, revogar token atual, criar sucessor e detectar reuse.
Logout deve ser POST idempotente e limpar cookie com os mesmos atributos.

- [ ] **Step 6: cobrir segurança e verificar**

Run: `npm run test -w packages/shared && npm run test:integration -w apps/api -- auth.integration.test.js`

Cobrir algoritmo errado, `iss/aud`, expiração de 20 minutos, enumeração, cinco
falhas/15 min e bootstrap bloqueando rotas de domínio.

- [ ] **Step 7: commit**

```bash
git add apps/api/src/modules/auth packages/shared/src/security apps/api/test packages/shared/test
git commit -m "feat(BE-003): add rotating JWT sessions"
```

---

### Task 5: BE-004 — Usuários, RBAC e auditoria sanitizada

**Files:**
- Create: `apps/api/src/modules/users/users.routes.js`
- Create: `apps/api/src/modules/users/users.controller.js`
- Create: `apps/api/src/modules/users/users.service.js`
- Create: `apps/api/src/modules/users/users.repository.js`
- Create: `apps/api/src/modules/users/users.schemas.js`
- Create: `apps/api/src/modules/audit/audit.service.js`
- Create: `apps/api/src/modules/audit/audit.repository.js`
- Create: `apps/api/src/modules/support/support.routes.js`
- Create: `apps/api/src/modules/support/support.controller.js`
- Create: `apps/api/src/modules/support/support.service.js`
- Create: `apps/api/src/middlewares/authorize.js`
- Test: `apps/api/test/authorization-matrix.integration.test.js`
- Test: `apps/api/test/user-block.integration.test.js`
- Test: `apps/api/test/support-redaction.integration.test.js`

**Interfaces:**
- Produces: `authorize(permission, loadResource?) -> Express middleware`
- Produces: `blockUser({ actor, targetId, reason }) -> UserStatus`
- Produces: `appendAudit(event, manager) -> void`

- [ ] **Step 1: codificar a matriz como teste antes das rotas**

```js
const cases = [
  ['ADMIN', 'POST', '/api/v1/users', 201],
  ['AGENT', 'POST', '/api/v1/users', 403],
  ['SUPPORT', 'GET', '/api/v1/conversations', 403],
  ['SUPPORT', 'GET', '/api/v1/support/health', 200],
];
it.each(cases)('%s %s %s -> %i', async (role, method, path, status) => {
  expect(await callAs(role, method, path)).toHaveProperty('status', status);
});
```

- [ ] **Step 2: executar Red e implementar permissions mínimas**

Run: `npm run test:integration -w apps/api -- authorization-matrix.integration.test.js`

Criar mapa central de permissões, middleware por rota e autorização por objeto
que retorna 403 uniforme. Rotas de usuário aceitam somente `AGENT`/`SUPPORT` e
rejeitam criação ou promoção de um segundo `ADMIN`.

- [ ] **Step 3: teste/implementação de bloqueio**

O teste deve provar incremento de `auth_version`, revogação de refresh, outbox
`user.status_changed.v1` e cancelamento dos jobs pendentes criados pelo alvo.

- [ ] **Step 4: teste/implementação de auditoria e SUPPORT**

Inserir evento na mesma transaction manager da mutação. Testar que DTO/log não
contém chaves `message`, `prompt`, `phone`, `token`, `media`, `qr` nem valores das
fixtures sensíveis.

- [ ] **Step 5: verificar e commit**

Run: `npm run test:integration -w apps/api -- authorization-matrix.integration.test.js user-block.integration.test.js support-redaction.integration.test.js`

```bash
git add apps/api/src/modules/users apps/api/src/modules/audit apps/api/src/modules/support apps/api/src/middlewares apps/api/test
git commit -m "feat(BE-004): enforce users permissions and audit"
```

---

### Task 6: BE-005 — APIs legadas, cache-aside e adapters Strangler

**Files:**
- Create: `apps/api/src/modules/inventory/inventory.routes.js`
- Create: `apps/api/src/modules/inventory/inventory.controller.js`
- Create: `apps/api/src/modules/inventory/inventory.service.js`
- Create: `apps/api/src/modules/inventory/inventory.repository.js`
- Create: `apps/api/src/modules/settings/settings.routes.js`
- Create: `apps/api/src/modules/settings/settings.controller.js`
- Create: `apps/api/src/modules/settings/settings.service.js`
- Create: `apps/api/src/modules/settings/settings.repository.js`
- Create: `apps/api/src/modules/contacts/contacts.routes.js`
- Create: `apps/api/src/modules/contacts/contacts.controller.js`
- Create: `apps/api/src/modules/contacts/contacts.service.js`
- Create: `apps/api/src/modules/contacts/contacts.repository.js`
- Create: `packages/shared/src/cache/cache-aside.js`
- Create: `apps/api/test/legacy-parity.integration.test.js`
- Create: `apps/api/test/cache-aside.integration.test.js`
- Modify: `index.js` somente depois do gate shadow aprovado

**Interfaces:**
- Produces: `cacheAside({ key, ttl, loader }) -> value`
- Produces: services `InventoryService`, `SettingsService`, `ContactsService`
- Produces: adaptador legado que converte REST DTOs nos eventos existentes.

- [ ] **Step 1: escrever teste concorrente de estoque**

```js
const [a, b] = await Promise.all([
  inventory.changeStock({ code: 'M4T001', delta: -2, operationId: 'sale-a' }),
  inventory.changeStock({ code: 'M4T001', delta: -3, operationId: 'sale-b' }),
]);
expect(await inventory.getByCode('M4T001')).toHaveProperty('onHand', 5);
expect(new Set([a.movementId, b.movementId]).size).toBe(2);
```

- [ ] **Step 2: confirmar Red e implementar transação mínima**

Run: `npm run test:integration -w apps/api -- legacy-parity.integration.test.js`

Usar row lock, constraint e movimento na mesma transação. Repetir `operationId`
deve devolver o resultado original.

- [ ] **Step 3: escrever cache test antes de cache-aside**

Ler recurso, limpar Redis, ler novamente e comparar corpo/ETag. Depois simular
Redis indisponível e confirmar fallback MySQL para leitura não sensível.

- [ ] **Step 4: implementar cache seletivo/outbox**

Usar namespace por instalação, TTL+jitter e generation keys. Efeito crítico
revalida MySQL; chave não inclui telefone em claro.

- [ ] **Step 5: implementar endpoints e paridade por recurso**

Cobrir estoque, configuração/prompt, tags/cores, pin/archive/AI pause e block.
OpenAPI/JSON Schema deve ser escrito antes de cada route test e validado no CI.

- [ ] **Step 6: adicionar adapter ao legado por feature flag**

Primeiro rodar `shadow` e `mirror` sem alterar leitura. Modificar handlers do
`index.js` apenas quando relatório de paridade da fatia estiver verde.

- [ ] **Step 7: verificar e commit**

Run: `npm run lint && npm run test && npm run test:integration && npm run openapi:check`

```bash
git add apps/api packages/shared packages/contracts index.js
git commit -m "feat(BE-005): migrate legacy data behind flags"
```

## Checkpoint do plano

Antes de PLAN-BE-02:

- BE-001..BE-005 marcadas `VERIFIED` e integradas em `dev`.
- Importação sombra e rollback ensaiados.
- Nenhum JSON promovido sem relatório assinado.
- JWT/refresh e matriz de permissões aprovados por revisão de segurança.
