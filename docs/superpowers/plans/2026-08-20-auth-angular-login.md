# Authentication and Angular Login Implementation Plan

> **For agentic workers:** execute each task in order. Security-critical
> behavior uses TDD and DDD; simple setup and presentation behavior uses
> proportionate automated checks. Do not commit, push, deploy, create a branch,
> or cut traffic without explicit user authorization. Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** replace the legacy login with a secure API authentication flow and an
Angular 22 + PrimeNG login application that requires every user to sign in again.

**Architecture:** MySQL stores users and hashed refresh-token families. The
Express `auth` module keeps route, controller, service and repository concerns
separate; policies enforce authorization on the server. Angular holds only the
short-lived access token in memory, while refresh is an `HttpOnly` cookie.

**Tech Stack:** Node.js ESM, Express 5, MySQL 8, TypeORM EntitySchema, Argon2id,
`jose`, Redis rate limiting, Angular 22, TypeScript strict, PrimeNG, Reactive
Forms, Vitest, Supertest and Playwright.

## Global Constraints

- Preserve `index.js`, its routes and every legacy JSON file until the explicit
  cutover task; no legacy session is migrated.
- New protected routes use `/api/v1`; API failures are RFC 9457 Problem Details
  with a request ID and never contain a password, token, user-existence signal
  or query string secret.
- `accessToken` uses RS256, `iss`, `aud`, `exp`, `jti`, `authVersion`, `sub` and
  `role`, expires after exactly 1,200 seconds and is never persisted by Angular.
- Refresh values are opaque, random, `HttpOnly`, `Secure`, `SameSite=Strict`
  cookies; MySQL contains hashes only and rotation reuses no value.
- Critical flows (credentials, tokens, revocation, rate limiting and policies)
  use TDD plus DDD boundaries. Endpoint-only presentation checks remain small.
- Roles initially are `ADMIN` and `AGENT`; frontend guards are UX only and never
  replace backend authorization.
- The initial ADMIN is seeded idempotently from external configuration with
  `must_change_credentials=true`.

---

### Task 1: Establish the web workspace and authenticated route boundary

**Files:**
- Create: `apps/web/` Angular 22 workspace, standalone application and strict
  TypeScript configuration.
- Create: `apps/web/src/app/app.routes.ts`
- Create: `apps/web/src/app/core/session/session.facade.ts`
- Create: `apps/web/src/app/core/session/auth.guard.ts`
- Create: `apps/web/src/app/features/login/login.page.ts`
- Create: `apps/web/src/app/features/empty/authorized-empty.page.ts`
- Create: `apps/web/src/app/app.routes.spec.ts`
- Modify: root `package.json`, `.gitignore`

**Interfaces:**
- Produces `SessionFacade.isAuthenticated(): boolean` and route paths `/login`,
  `/change-initial-credentials` and `/app`.
- `/app` is a protected empty page, not a business dashboard.

- [ ] **Step 1: Scaffold Angular with standalone components, routing, strict
  TypeScript and Vitest; add PrimeNG and its theme provider.**

  The application bootstrap must provide HTTP client, router and PrimeNG:

  ```ts
  bootstrapApplication(AppComponent, {
    providers: [provideRouter(routes), provideHttpClient(), providePrimeNG()]
  });
  ```

- [ ] **Step 2: Add a small route test for unauthenticated navigation.**

  ```ts
  it('redirects an unauthenticated visitor from /app to /login', async () => {
    await router.navigateByUrl('/app');
    expect(location.path()).toBe('/login');
  });
  ```

- [ ] **Step 3: Implement `authGuard` and the placeholder authorized page.**

  ```ts
  export const authGuard: CanActivateFn = () =>
    inject(SessionFacade).isAuthenticated() || inject(Router).parseUrl('/login');
  ```

- [ ] **Step 4: Run the frontend unit test and production build.**

  Run: `npm run test -w @hubbie/web -- app.routes.spec.ts` and
  `npm run build -w @hubbie/web`.

---

### Task 2: Add MySQL configuration, schema and repositories for authentication

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/src/data-source.js`
- Create: `packages/database/src/entities/user.schema.js`
- Create: `packages/database/src/entities/refresh-token.schema.js`
- Create: `packages/database/src/migrations/202608200001-auth-schema.js`
- Create: `packages/database/src/repositories/user.repository.js`
- Create: `packages/database/src/repositories/refresh-token.repository.js`
- Create: `packages/database/test/auth-schema.integration.test.js`
- Modify: `packages/shared/src/config/load-config.js` and its tests

**Interfaces:**
- Produces `createDataSource(config)` and repositories with
  `findByLogin(login)`, `createInitialAdmin(input)`, `createRefreshToken(input)`,
  `findRefreshTokenByHash(hash)` and `revokeFamily(familyId)`.
- `users` has `id`, `login`, `password_hash`, `role`, `auth_version`,
  `must_change_credentials`, `status`, timestamps; `refresh_tokens` has token
  hash, family, expiration, revocation and replacement metadata.

- [ ] **Step 1: Add a migration integration test against `TEST_DATABASE_URL`.**

  ```js
  it('creates users and refresh_tokens with the required unique constraints', async () => {
    await dataSource.runMigrations();
    await expect(insertDuplicateLogin()).rejects.toThrow();
    await expect(insertDuplicateRefreshHash()).rejects.toThrow();
  });
  ```

- [ ] **Step 2: Run the migration test and confirm it fails because the schema
  does not exist.**

  Run: `npm run test -w @hubbie/database -- auth-schema.integration.test.js`.

- [ ] **Step 3: Implement EntitySchemas, additive migration and narrow
  repositories.**

  ```js
  export function createUserRepository(dataSource) {
    return {
      findByLogin: (login) => dataSource.getRepository('User').findOneBy({ login }),
      createInitialAdmin: (input) => dataSource.getRepository('User').save(input)
    };
  }
  ```

- [ ] **Step 4: Add validated database, Redis, issuer, audience, RSA key-path,
  bootstrap-admin and shutdown configuration without logging their values.**

- [ ] **Step 5: Re-run migration tests, then run migration down/up once against
  an empty test database.**

---

### Task 3: Implement credential and token primitives with TDD

**Files:**
- Create: `apps/api/src/modules/auth/credential.service.js`
- Create: `apps/api/src/modules/auth/token.service.js`
- Create: `apps/api/test/auth/credential.service.test.js`
- Create: `apps/api/test/auth/token.service.test.js`
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces `hashPassword(password)`, `verifyPassword(hash, password)`,
  `issueAccessToken(session)`, `verifyAccessToken(token)` and
  `hashRefreshToken(rawToken)`.
- `issueAccessToken` returns `{ accessToken, expiresIn: 1200 }`; verification
  accepts only RS256 and the configured issuer/audience.

- [ ] **Step 1: Write failing tests for Argon2id verification, RS256 acceptance,
  wrong algorithm rejection, expired token rejection and stable refresh hashing.**

  ```js
  it('rejects a token signed with HS256 even when its claims are valid', async () => {
    await expect(verifyAccessToken(hs256Token)).rejects.toMatchObject({ status: 401 });
  });
  ```

- [ ] **Step 2: Run the focused tests and confirm the missing services cause the
  failures.**

  Run: `npm run test -w @hubbie/api -- credential.service.test.js token.service.test.js`.

- [ ] **Step 3: Implement Argon2id and `jose` services using injected key
  material; never expose raw credentials or raw refresh values in logs.**

  ```js
  export async function issueAccessToken({ user, privateKey, issuer, audience }) {
    return new SignJWT({ role: user.role, authVersion: user.authVersion })
      .setProtectedHeader({ alg: 'RS256' }).setSubject(user.id)
      .setIssuer(issuer).setAudience(audience).setJti(randomUUID())
      .setIssuedAt().setExpirationTime('20m').sign(privateKey);
  }
  ```

- [ ] **Step 4: Re-run the focused tests and then the entire API test suite.**

---

### Task 4: Implement login, refresh rotation and logout as the auth domain

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.js`
- Create: `apps/api/src/modules/auth/auth.controller.js`
- Create: `apps/api/src/modules/auth/auth.routes.js`
- Create: `apps/api/src/modules/auth/auth.schemas.js`
- Create: `apps/api/src/modules/auth/auth.events.js`
- Create: `apps/api/test/auth/auth.integration.test.js`
- Modify: `apps/api/src/app.js`, `packages/contracts/openapi/openapi.yaml`

**Interfaces:**
- `AuthService.login({ login, password, ip }) -> { accessToken, expiresIn, session, refreshToken, refreshTtlMs }`.
- `AuthService.refresh({ refreshToken, ip })` rotates exactly once and revokes the
  whole family on reuse.
- `AuthService.logout({ refreshToken })` revokes the current family token.

- [ ] **Step 1: Write failing integration tests for valid login, neutral invalid
  credentials, refresh rotation, reuse revocation and logout.**

  ```js
  it('revokes the refresh family when a rotated refresh token is reused', async () => {
    const credentials = { login: 'admin', password: 'temporary-password' };
    const first = await request(app).post('/api/v1/auth/login').send(credentials);
    const second = await request(app).post('/api/v1/auth/refresh').set('Cookie', first.headers['set-cookie']);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', first.headers['set-cookie'])).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', second.headers['set-cookie'])).status).toBe(401);
  });
  ```

- [ ] **Step 2: Run this test file; verify that each failure is from the absent
  route/service behavior.**

- [ ] **Step 3: Implement request validation, service orchestration, secure
  cookie issuance and neutral `401` Problem Details.**

  ```js
  response.cookie('__Host-hubbie.refresh', result.refreshToken, {
    httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: result.refreshTtlMs
  });
  response.status(200).json({
    accessToken: result.accessToken, expiresIn: 1200, session: result.session
  });
  ```

- [ ] **Step 4: Document every response and cookie behavior in OpenAPI, then run
  the auth integration and contract tests.**

---

### Task 5: Enforce bootstrap credentials, rate limits and server authorization

**Files:**
- Create: `apps/api/src/modules/auth/initial-credentials.service.js`
- Create: `apps/api/src/middlewares/require-auth.js`
- Create: `apps/api/src/middlewares/require-permission.js`
- Create: `apps/api/src/modules/auth/login-rate-limit.js`
- Create: `apps/api/test/auth/security.integration.test.js`
- Modify: `apps/api/src/modules/auth/auth.routes.js`, `apps/api/src/app.js`

**Interfaces:**
- `requireAuth` assigns an authenticated principal only after JWT verification and
  `auth_version` validation.
- `requirePermission(permission)` returns 403 without leaking object details.
- `changeInitialCredentials({ userId, currentPassword, login, password })`
  increments `auth_version`, clears `must_change_credentials` and revokes refreshes.

- [ ] **Step 1: Write failing tests for five failed logins, first-access route
  restriction, password change and an AGENT denied an ADMIN permission.**

  ```js
  it('returns 429 and Retry-After after five failures for the same IP and login', async () => {
    const invalidCredentials = { login: 'admin', password: 'wrong-password' };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', '203.0.113.1').send(invalidCredentials);
    }
    const response = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', '203.0.113.1').send(invalidCredentials);
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeTruthy();
  });
  ```

- [ ] **Step 2: Run the security test and verify the new cases fail first.**

- [ ] **Step 3: Implement the Redis-backed IP+identity limiter, initial-credential
  policy and explicit permission middleware. Publish only a sanitized
  `auth.revoked` event when a token family is invalidated.**

- [ ] **Step 4: Re-run the security suite and all API tests.**

---

### Task 6: Build the Angular session boundary and HTTP recovery

**Files:**
- Create: `apps/web/src/app/core/auth/auth-api.service.ts`
- Create: `apps/web/src/app/core/session/session.facade.ts`
- Create: `apps/web/src/app/core/http/auth.interceptor.ts`
- Create: `apps/web/src/app/core/session/permission.guard.ts`
- Create: `apps/web/src/app/core/session/session.facade.spec.ts`
- Create: `apps/web/src/app/core/http/auth.interceptor.spec.ts`

**Interfaces:**
- `SessionFacade.login(credentials)`, `refresh()`, `logout()`, `session()` and
  `mustChangeCredentials()` expose Angular signals.
- The interceptor adds Bearer access tokens and causes one shared refresh for
  concurrent `401` responses.

- [ ] **Step 1: Write failing tests for memory-only token state, a single refresh
  across concurrent `401`s, failed refresh cleanup and role guard denial.**

  ```ts
  it('starts one refresh for two concurrent unauthorized requests', async () => {
    await Promise.all([http.get('/protected/one'), http.get('/protected/two')]);
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
  });
  ```

- [ ] **Step 2: Run the focused tests and confirm the facade/interceptor is
  absent.**

- [ ] **Step 3: Implement signals, single-flight refresh and navigation to
  `/login` after refresh failure. Do not access cookies, localStorage or
  sessionStorage.**

- [ ] **Step 4: Re-run focused frontend tests and the production build.**

---

### Task 7: Deliver the PrimeNG login and initial-credential pages

**Files:**
- Modify: `apps/web/src/app/features/login/login.page.ts`
- Create: `apps/web/src/app/features/login/login.page.html`
- Create: `apps/web/src/app/features/login/login.page.scss`
- Create: `apps/web/src/app/features/login/change-initial-credentials.page.ts`
- Create: `apps/web/src/app/features/login/change-initial-credentials.page.html`
- Create: `apps/web/src/app/features/login/login.page.spec.ts`
- Create: `apps/web/e2e/login.spec.ts`

**Interfaces:**
- Login form accepts `{ login, password }`; initial-credential form accepts
  `{ currentPassword, login, password, confirmation }`.
- Valid form submission calls `SessionFacade.login`; temporary credentials route
  only to `/change-initial-credentials`.

- [ ] **Step 1: Add component tests for required fields, length constraints,
  password confirmation, disabled submit while pending and accessible error
  messages.**

  ```ts
  expect(component.form.controls.password.errors?.['required']).toBeTrue();
  expect(screen.getByRole('button', { name: /entrar/i })).toBeDisabled();
  ```

- [ ] **Step 2: Implement PrimeNG `InputText`, `Password`, `Button` and inline
  message components with Reactive Forms. Use labels, live error regions and
  neutral server-error copy.**

- [ ] **Step 3: Add Playwright coverage for valid login, invalid credentials,
  temporary-credential change, logout and expired-session redirect.**

- [ ] **Step 4: Run Angular unit tests, Playwright and the production build.**

---

### Task 8: Verify the cutover without migrating the legacy session

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-auth-angular-login-design.md`
- Create: `docs/runbooks/auth-cutover.md`
- Modify: only gateway/proxy configuration explicitly approved for the cutover.

**Interfaces:**
- The cutover accepts only new auth routes and `/app`; `connect.sid` is ignored
  by new API authorization.
- Rollback disables the new route mapping without deleting auth data.

- [ ] **Step 1: Document preflight configuration checks, backup, admin bootstrap,
  route switch, smoke checks, rollback and incident contacts.**

- [ ] **Step 2: Execute staging smoke checks with a fresh browser profile.**

  ```text
  1. Old connect.sid only -> new /api/v1/auth/session returns 401.
  2. New login -> /app loads; refresh cookie is HttpOnly/Secure/SameSite=Strict.
  3. Logout -> protected route redirects to /login.
  4. Reused refresh -> all family tokens fail.
  ```

- [ ] **Step 3: Run `npm test`, `npm run lint`, frontend production build and
  OpenAPI tests; inspect the legacy-file diff and the browser network panel for
  persisted access tokens.**

- [ ] **Step 4: Request human review and explicit authorization before any
  commit, proxy switch, deployment or production cutover.**

## Plan Self-Review

- The plan covers MySQL/auth persistence, secure token issuance and rotation,
  initial credentials, rate limiting, RBAC, Angular session behavior, PrimeNG
  validation, relogin cutover and rollback.
- All critical security behaviors have a fail-first test step; setup and UI-only
  work use focused checks rather than forced DDD ceremony.
- No task introduces a dashboard or business endpoint. Later backend endpoints
  consume `requireAuth` and `requirePermission` from Task 5.
