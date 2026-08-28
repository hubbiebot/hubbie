# BE-001 — Plano de Implementação: Express e OpenAPI

> **Para agentes de implementação:** execute este plano tarefa a tarefa com o ciclo Red-Green-Refactor. Não faça commit, push, PR, deploy ou crie branch sem autorização explícita.

**Objetivo:** disponibilizar uma fundação isolada de API em Express 5, com OpenAPI 3.1 e Swagger UI somente em desenvolvimento.

**Arquitetura:** `createApp()` compõe os middlewares e as rotas HTTP sem abrir porta. `server.js` é responsável pela inicialização e pelo desligamento gracioso. O contrato OpenAPI em YAML é independente do framework; Swagger UI o serve apenas na configuração de desenvolvimento.

**Stack técnica:** Node.js 20+, JavaScript ESM, Express 5, Vitest, Supertest, Helmet, CORS, Swagger UI Express e parser/validador YAML.

## Restrições globais

- Preserve `index.js`, `index.html`, `login.html`, and every legacy JSON file unchanged.
- Do not add MySQL, Redis, BullMQ, authentication, Socket.IO, WhatsApp, or business modules.
- Validate configuration before listening; no secret has a default value or appears in a log.
- Restrict Swagger UI to `NODE_ENV=development`; it must not be registered in production.
- Use RFC 9457 Problem Details for HTTP errors and include `requestId` in each error response.
- Keep source modules small: routers compose controllers; controllers do not contain OpenAPI annotations.

## Mapa de arquivos

```text
package.json                                      root workspace scripts
apps/api/package.json                             API dependencies and test scripts
apps/api/src/app.js                               Express composition
apps/api/src/server.js                            startup and shutdown lifecycle
apps/api/src/middlewares/request-id.js            request correlation middleware
apps/api/src/middlewares/error-handler.js         RFC 9457 conversion and error middleware
apps/api/src/modules/health/health.controller.js  liveness/readiness response handlers
apps/api/src/modules/health/health.routes.js      health router
apps/api/src/openapi/swagger.js                   development-only Swagger mounting
apps/api/test/health.test.js                      health behavior integration tests
apps/api/test/http-safety.test.js                 limits, errors, CORS and Swagger tests
packages/contracts/package.json                   contract package metadata
packages/contracts/openapi/openapi.yaml           OpenAPI 3.1 source contract
packages/contracts/test/openapi.test.js           contract parse and required-path test
packages/shared/src/config/load-config.js         validated immutable runtime config
packages/shared/test/load-config.test.js          config validation tests
```

---

### Tarefa 1: Estabelecer a composição testável da API e as rotas de saúde

**Files:**
- Create: `apps/api/src/app.js`
- Create: `apps/api/src/modules/health/health.controller.js`
- Create: `apps/api/src/modules/health/health.routes.js`
- Create: `apps/api/test/health.test.js`

**Interfaces:**
- Produces `createApp({ config, logger, readiness }) -> Express`.
- `readiness() -> Promise<{ ready: boolean }>` is injected, so no database or Redis connection exists in this task.

- [ ] **Step 1: Write the failing health tests.**

```js
it('keeps liveness independent of dependencies', async () => {
  const app = createApp({ config, logger, readiness: async () => ({ ready: false }) });
  expect((await request(app).get('/health/live')).status).toBe(200);
});

it('returns 503 when readiness is false', async () => {
  const app = createApp({ config, logger, readiness: async () => ({ ready: false }) });
  expect((await request(app).get('/health/ready')).status).toBe(503);
});
```

- [ ] **Step 2: Run `npm run test -w @hubbie/api -- health.test.js` and verify the failure is caused by the absent API modules.**

- [ ] **Step 3: Implement the smallest health controller/router and `createApp()` composition.**

```js
export function createApp({ config, logger, readiness }) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/health', createHealthRouter({ readiness }));
  return app;
}
```

- [ ] **Step 4: Re-run the focal test and confirm both assertions pass.**

---

### Tarefa 2: Adicionar proteções HTTP e erros Problem Details

**Files:**
- Create: `apps/api/src/middlewares/request-id.js`
- Create: `apps/api/src/middlewares/error-handler.js`
- Modify: `apps/api/src/app.js`
- Create: `apps/api/test/http-safety.test.js`

**Interfaces:**
- Produces `requestIdMiddleware(request, response, next)` which sets `request.id` and `X-Request-Id`.
- Produces `problemDetails(error, requestId) -> { type, title, status, detail, instance, requestId }`.

- [ ] **Step 1: Write failing tests for an async route failure and a JSON body larger than 256 KB.**

```js
expect(response.body).toMatchObject({
  type: 'about:blank', title: 'Internal Server Error', status: 500,
});
expect(response.body).not.toHaveProperty('stack');
expect(response.headers['x-request-id']).toBeTruthy();
```

- [ ] **Step 2: Run the focal test and verify it fails because the middleware is absent.**

- [ ] **Step 3: Add exact-origin CORS, Helmet, `express.json({ limit: '256kb' })`, request IDs and terminal error middleware.**

- [ ] **Step 4: Test a denied Origin and assert no permissive `Access-Control-Allow-Origin` header is returned.**

- [ ] **Step 5: Re-run API tests and lint; all tests must pass without logging request bodies.**

---

### Tarefa 3: Validar configuração e ciclo de vida gracioso

**Files:**
- Create: `packages/shared/src/config/load-config.js`
- Create: `packages/shared/test/load-config.test.js`
- Create: `apps/api/src/server.js`
- Modify: `apps/api/src/app.js`

**Interfaces:**
- Produces `loadConfig(source) -> Readonly<{ env, port, allowedOrigins }>`.
- Produces `startServer({ config, logger, readiness }) -> { close }`.

- [ ] **Step 1: Write failing config tests for a missing `PORT` and invalid `ALLOWED_ORIGINS`.**

```js
expect(() => loadConfig({ NODE_ENV: 'development' })).toThrow('CONFIG_INVALID');
```

- [ ] **Step 2: Implement strict parsing with a finite allowed environment set and absolute HTTP(S) origins. Do not read or log secrets.**

- [ ] **Step 3: Write a failing lifecycle test asserting that shutdown marks readiness false before `server.close()`.**

- [ ] **Step 4: Implement SIGTERM/SIGINT handling with an idempotent `close()` function and configured timeout.**

- [ ] **Step 5: Run shared and API tests.**

---

### Tarefa 4: Tornar OpenAPI 3.1 o contrato da API e expor Swagger em desenvolvimento

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/openapi/openapi.yaml`
- Create: `packages/contracts/test/openapi.test.js`
- Create: `apps/api/src/openapi/swagger.js`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.js`
- Modify: `package.json` only if a root script is needed for contract validation
- Modify: `apps/api/test/http-safety.test.js`

**Interfaces:**
- OpenAPI documents `GET /health/live`, `GET /health/ready`, and reusable RFC 9457 responses.
- Produces `mountSwagger(app, { env, specPath })`, which mounts `/api-docs` only for `development`.

- [ ] **Step 1: Write a failing contract test that parses OpenAPI 3.1 and requires both health paths and a `ProblemDetails` schema.**

```js
expect(spec.openapi).toBe('3.1.0');
expect(spec.paths).toHaveProperty('/health/live');
expect(spec.components.schemas).toHaveProperty('ProblemDetails');
```

- [ ] **Step 2: Write failing integration tests: development `GET /api-docs` returns 200; production returns 404.**

- [ ] **Step 3: Add the minimal YAML contract, parser/validator, `swagger-ui-express`, and development-only mount.**

- [ ] **Step 4: Re-run contract and API tests. Confirm Swagger cannot be reached when `env` is `production`.**

---

### Tarefa 5: Verificar o gate da BE-001 sem tocar no legado

**Files:**
- Modify only the files from Tasks 1–4 if verification exposes a defect.

- [ ] **Step 1: Run `npm run lint`.**
- [ ] **Step 2: Run `npm test`.**
- [ ] **Step 3: Start the API with development configuration and request `/health/live`, `/health/ready`, and `/api-docs`.**
- [ ] **Step 4: Start with production configuration and confirm `/api-docs` is 404.**
- [ ] **Step 5: Inspect `git diff -- index.js index.html login.html estoque.json config.json tags.json cores.json fixados.json arquivadas.json` and confirm it is empty.**
- [ ] **Step 6: Request human review before any commit, branch operation, release, or promotion.**

## Auto-revisão do plano

- Coverage: health, configuration, Swagger/OpenAPI, HTTP limits, redaction boundary, errors, shutdown, and rollback map to the approved design.
- No placeholders: the plan defines paths, interfaces, test assertions, and expected commands.
- Consistency: `createApp`, `readiness`, `loadConfig`, and `mountSwagger` use the same signatures throughout.
