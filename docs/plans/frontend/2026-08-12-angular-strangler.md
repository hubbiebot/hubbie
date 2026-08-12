# Angular Strangler — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Use
> `superpowers:subagent-driven-development` only if the user explicitly requests
> subagents. Every implementation task follows Red → Green → Refactor and ends
> at its human checkpoint.

**Goal:** substituir progressivamente o frontend legado por Angular 22 em
`apps/web`, preservando a operação por `/legacy`, começando pelo Golden Master e
entregando login, caixa compartilhada, texto, mídias, campanhas, administração,
observabilidade e cutover com rollback imediato.

**Architecture:** SPA Angular standalone em fatias lazy-loaded. Pages/facades
coordenam estado com Signals; componentes visuais são stateless e OnPush. REST é
autoritativo para leitura/mutação e Socket.IO versionado apenas notifica mudanças;
reconexão sempre converge por snapshot REST. A UI legada e seu Socket.IO atual
permanecem intactos até o cutover de cada rota.

**Tech Stack:** Angular 22, TypeScript strict, Tailwind CSS 4, RxJS, Angular
Signals, Reactive Forms, Socket.IO Client, Lucide Angular, Vitest/TestBed,
Playwright, axe-core e contratos OpenAPI 3.1/JSON Schema do monorepo.

## Autoridade e gates

- Este documento organiza a execução; ele não autoriza implementar uma task.
- A spec `FE-*` da task deve estar `APPROVED`, com hash/commit registrado, antes
  de criar branch ou editar código.
- Dependências `BE-*` citadas na spec devem estar integradas em `dev`, com
  contratos versionados e ambiente de teste disponível.
- Começar sempre da `dev` atualizada em worktree/branch
  `feat/<spec-em-minusculas>-descricao`.
- Não avançar automaticamente para a task seguinte: cada seção termina em
  checkpoint humano.
- Não promover feature flag, alterar Nginx, fazer deploy ou remover legado sem
  autorização específica.

## Restrições globais

- Aplicação Angular em `apps/web`; não criar um workspace paralelo em
  `frontend/`.
- Usar componentes standalone, `ChangeDetectionStrategy.OnPush`, template
  control flow e APIs Angular atuais.
- Pages podem injetar facades; componentes em `ui/` recebem `input()` e emitem
  `output()`, sem injetar HTTP, Router, storage ou Socket.IO.
- Signals guardam estado síncrono. RxJS fica em HTTP, Socket.IO, timers, upload,
  gravação e outras fronteiras assíncronas.
- Estado derivado usa `computed()`; não duplicar listas filtradas, contadores ou
  permissões em stores separados.
- REST executa comandos com idempotency key. Socket.IO não executa mutações.
- Access token fica somente em memória; refresh permanece em cookie HttpOnly e
  nunca é lido pelo navegador.
- Conteúdo externo usa text binding. Proibidos `innerHTML`, bypass de sanitizer
  e URLs de mídia sem lifecycle explícito.
- Tema claro por padrão, fonte `"Segoe UI Variable", "Segoe UI", system-ui,
  sans-serif`, tokens semânticos e somente ícones Lucide importados.
- Interfaces devem distinguir loading, vazio, indisponível, degradado, erro e
  dado verdadeiro; zero não representa falha de observabilidade.
- Não apresentar `sent`, `delivered`, `read`, `clean` ou progresso sem estado
  confirmado pelo backend.
- `shared/` só recebe código depois de dois consumidores concretos.
- Toda task começa com teste falhando, guarda a causa do Red e termina com teste
  focal, suite do workspace, lint, build e `git diff --check`.

## Contratos consumidos

| Área | Autoridade | Uso no frontend |
|---|---|---|
| HTTP | `packages/contracts/openapi/` | cliente e tipos gerados, nunca DTO manual divergente |
| Eventos | `packages/contracts/events/` | validação de envelope e payload versionado |
| Autenticação | BE-003 | JWT em memória, refresh cookie, sessão sanitizada |
| Conversas/mensagens | BE-006 | snapshots, paginação, comandos idempotentes |
| Realtime | BE-007 | notificações versionadas e reconciliação REST |
| Campanhas | BE-009 | criação, revisão, comandos e progresso confirmado |
| Mídia | BE-010 | upload/download autenticado e estados de segurança |
| Usuários/auditoria | BE-004 | RBAC, encerramento de sessão e dados sanitizados |

Qualquer incompatibilidade entre contrato e spec pausa a task. O frontend não
compensa silenciosamente um contrato incorreto com campos opcionais ou casts.

## Mapa planejado

```text
apps/web/
  src/app/
    core/
      api/                    cliente gerado, problem details, interceptors
      auth/                   sessão, guards e refresh single-flight
      config/                 runtime config e feature flags
      realtime/               porta, adapter Socket.IO e reconciliação
    layout/                   shell e navegação por permissão
    features/
      auth/
      conversations/
      media/
      campaigns/
      operations/
      users/
      support/
    shared/                   somente segundo consumidor comprovado
    app.config.ts
    app.routes.ts
  src/styles/
    tokens.css
    tailwind.css
  public/config/runtime-config.json
  tests/
    contract/
    fixtures/
    golden-master/
    e2e/
  eslint.config.js
  playwright.config.ts
  proxy.conf.json
  vite.config.ts
packages/contracts/          fonte canônica mantida pelo backend
index.html                   legado preservado até FE-009
login.html                   legado preservado até FE-009
```

---

### Task 1: FE-001 — Golden Master determinístico do legado

**Preconditions:** FE-001 `APPROVED`.

**Files:**
- Modify: `package.json` somente para registrar `apps/web` como workspace ausente
- Modify: `package-lock.json`
- Create: `apps/web/package.json`
- Create: `apps/web/angular.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tsconfig.app.json`
- Create: `apps/web/tsconfig.spec.json`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/golden-master/legacy-harness.ts`
- Create: `apps/web/tests/golden-master/legacy-login.spec.ts`
- Create: `apps/web/tests/golden-master/legacy-conversations.spec.ts`
- Create: `apps/web/tests/golden-master/legacy-admin.spec.ts`
- Create: `apps/web/tests/fixtures/legacy-clock.ts`
- Create: `apps/web/tests/fixtures/legacy-socket.ts`
- Create: `apps/web/tests/fixtures/legacy-data.ts`
- Create: `apps/web/tests/golden-master/README.md`
- Create: `apps/web/tests/golden-master/snapshots/`

**Interfaces:**
- Produces: `openLegacyPage(page, scenario) -> Promise<void>`.
- Produces: `LegacySocketFixture` com `on`, `off`, `emit` e captura ordenada.
- Produces: manifesto de viewport, locale, timezone, relógio e dados por snapshot.

- [ ] **Step 1: criar somente a infraestrutura isolada de teste**

Run: `npx @angular/cli@22 new web --directory apps/web --standalone --routing --style css --strict --skip-git --skip-install --package-manager npm`

Registrar `apps/web` no workspace raiz se BE-001 ainda não o tiver feito,
adicionar `@playwright/test` e axe-core como dependências de desenvolvimento e
executar `npm install` na raiz. Nenhuma rota produtiva aponta ao Angular.

- [ ] **Step 2: fixar os cenários observáveis antes do harness**

Documentar no teste os fluxos `login`, `status operacional`, `selecionar
conversa`, `enviar texto`, `arquivar/reabrir` e `abrir administração`. Congelar
viewport em `1440x900`, locale `pt-BR`, timezone `America/Sao_Paulo`, animações e
relógio `2026-08-12T12:00:00-03:00`.

- [ ] **Step 3: executar e confirmar Red**

Run: `npm run test:golden -w apps/web -- legacy-login.spec.ts`

Expected: FAIL porque `legacy-harness.ts` e fixtures ainda não existem.

- [ ] **Step 4: criar harness mínimo sem rede real**

Interceptar HTTP, fontes, Socket.IO, WhatsApp e OpenAI. Carregar os HTMLs legados
com dados fixos e falhar o teste se houver request não declarada. O fake socket
deve registrar nome/payload/ordem de cada emissão sem alterar o código legado.

- [ ] **Step 5: capturar comportamento e acessibilidade**

Para cada cenário, salvar screenshot, texto essencial, foco final, anúncios
`aria-live` e eventos emitidos. Rodar duas vezes e comparar hashes para provar
determinismo. Diferenças existentes viram observação no README, não correção do
legado nesta task.

- [ ] **Step 6: verificar**

Run: `npm run test:golden -w apps/web -- --repeat-each=2`

Expected: duas execuções idênticas, zero rede externa e snapshots versionados.

- [ ] **Step 7: commit e checkpoint**

```bash
git add package.json package-lock.json apps/web
git commit -m "test(FE-001): characterize legacy frontend"
```

Checkpoint: revisão humana diferencia paridade necessária de mudanças
intencionais de usabilidade.

---

### Task 2: FE-001 — Workspace Angular, tokens e lazy shell

**Preconditions:** Task 1 revisada; nenhuma rota produtiva muda.

**Files:**
- Modify: `package.json` somente para scripts ausentes
- Modify: `package-lock.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/angular.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/tsconfig.app.json`
- Modify: `apps/web/tsconfig.spec.json`
- Create: `apps/web/eslint.config.js`
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/app/app.config.ts`
- Create: `apps/web/src/app/app.routes.ts`
- Create: `apps/web/src/app/core/config/runtime-config.ts`
- Create: `apps/web/src/app/core/config/runtime-config.spec.ts`
- Create: `apps/web/src/app/layout/app-shell.component.ts`
- Create: `apps/web/src/app/layout/app-shell.component.html`
- Create: `apps/web/src/app/features/conversations/conversations.routes.ts`
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/tailwind.css`
- Create: `apps/web/public/config/runtime-config.json`

**Interfaces:**
- Produces: `RuntimeConfig` validado com `apiBaseUrl`, `socketPath`, `legacyUrl`
  e flags por rota.
- Produces: rota interna `/app` e feature routes carregadas por `loadChildren`.
- Produces: tokens `surface`, `content`, `border`, `accent`, `success`, `warning`
  e `danger`, sem cor de domínio hardcoded no template.

- [ ] **Step 1: instalar as dependências da fundação**

Run: `npm install -w apps/web tailwindcss @tailwindcss/postcss socket.io-client @lucide/angular && npm install -D -w apps/web angular-eslint @axe-core/playwright`

Configurar Tailwind 4, ESLint e scripts de teste/build no workspace já criado na
Task 1. Revisar `package.json` e lockfile antes de continuar.

- [ ] **Step 2: escrever testes falhando de config e lazy loading**

Testar runtime config ausente/inválido, flag desligada apontando para `/legacy`,
e manifesto de build sem `conversations` no chunk inicial.

Run: `npm run test -w apps/web -- runtime-config.spec.ts`

Expected: FAIL porque loader, schema e routes ainda não existem.

- [ ] **Step 3: implementar bootstrap/configuração mínima**

Carregar config antes do bootstrap, validar URLs relativas/mesma origem, prover
HTTP com interceptors vazios e roteamento. A flag desabilitada deve navegar para
`legacyUrl` sem importar o feature chunk.

- [ ] **Step 4: criar shell visual mínimo e tokens**

Aplicar tema claro, Segoe UI Variable, foco visível, landmarks e breakpoints.
Importar ícones Lucide individualmente. O shell não consulta API nem contém
lógica de permissão nesta task.

- [ ] **Step 5: verificar build e chunks**

Run: `npm run lint -w apps/web && npm run test -w apps/web && npm run build -w apps/web`

Expected: strict/lint/test/build verdes e feature lazy fora do initial bundle.

- [ ] **Step 6: commit e checkpoint**

```bash
git add package.json package-lock.json apps/web
git commit -m "feat(FE-001): establish Angular foundation"
```

Checkpoint: Angular continua apenas em URL interna; legado é a operação padrão.

---

### Task 3: FE-002 — Login, refresh single-flight e shell autorizado

**Preconditions:** FE-002 `APPROVED`; BE-003 integrado; OpenAPI de auth estável.

**Files:**
- Create: `apps/web/src/app/core/api/generated/auth-api.ts`
- Create: `apps/web/src/app/core/auth/session.models.ts`
- Create: `apps/web/src/app/core/auth/session.facade.ts`
- Create: `apps/web/src/app/core/auth/session.facade.spec.ts`
- Create: `apps/web/src/app/core/auth/auth.interceptor.ts`
- Create: `apps/web/src/app/core/auth/auth.interceptor.spec.ts`
- Create: `apps/web/src/app/core/auth/auth.guard.ts`
- Create: `apps/web/src/app/core/auth/permission.guard.ts`
- Create: `apps/web/src/app/features/auth/login/`
- Create: `apps/web/src/app/features/auth/change-credentials/`
- Modify: `apps/web/src/app/layout/app-shell.component.*`
- Test: `apps/web/tests/e2e/auth-session.spec.ts`

**Interfaces:**
- Consumes: `POST /api/v1/auth/login`, `/refresh`, `/logout` e troca inicial.
- Produces: `SessionFacade` com `session`, `isAuthenticated`, `permissions`,
  `login()`, `refreshOnce()` e `logout()`.
- Invariant: access token nunca cruza `localStorage`/`sessionStorage`/IndexedDB.

- [ ] **Step 1: gerar cliente e provar ausência de drift**

Run: `npm run contracts:generate -w apps/web && npm run contracts:check -w apps/web`

Expected: cliente gerado corresponde ao OpenAPI commitado; CI falha se geração
posterior produzir diff.

- [ ] **Step 2: escrever testes Red da sessão**

Cobrir login, `mustChangeCredentials`, token apenas em memória, logout, bloqueio,
expiração e três respostas 401 concorrentes resultando em um único refresh.

Run: `npm run test -w apps/web -- session.facade.spec.ts auth.interceptor.spec.ts`

Expected: FAIL por facade/interceptor inexistentes.

- [ ] **Step 3: implementar sessão mínima**

Guardar token em signal privado. Enviar refresh com cookie via `withCredentials`.
Serializar refresh concorrente com observable compartilhado e limpar a referência
em `finalize`. Uma falha encerra sessão sem loop de interceptor.

- [ ] **Step 4: testar e implementar guards/shell**

Escrever matriz ADMIN/AGENT/SUPPORT antes das rotas. Implementar guards por
permissão e navegação derivada da sessão. SUPPORT não deve criar componente nem
request de conversa, mídia, prompt ou QR.

- [ ] **Step 5: implementar formulários acessíveis**

Reactive Forms, autocomplete correto, mensagens associadas, submit loading,
preservação de username em erro recuperável e troca inicial restritiva.

- [ ] **Step 6: E2E e verificação**

Run: `npm run test -w apps/web && npm run e2e -w apps/web -- auth-session.spec.ts && npm run build -w apps/web`

- [ ] **Step 7: commit e checkpoint**

```bash
git add apps/web/src/app/core apps/web/src/app/features/auth apps/web/src/app/layout apps/web/tests/e2e
git commit -m "feat(FE-002): add secure frontend sessions"
```

Checkpoint: revisão de segurança confirma storage, cookies, 401 e matriz de
papéis antes de habilitar login Angular internamente.

---

### Task 4: FE-003 — Contratos, snapshots e realtime convergente

**Preconditions:** FE-003 `APPROVED`; BE-006 e BE-007 integrados.

**Files:**
- Create: `apps/web/src/app/core/realtime/realtime.port.ts`
- Create: `apps/web/src/app/core/realtime/socket-io.adapter.ts`
- Create: `apps/web/src/app/core/realtime/socket-io.adapter.spec.ts`
- Create: `apps/web/src/app/features/conversations/data/conversation.models.ts`
- Create: `apps/web/src/app/features/conversations/data/conversations.api.ts`
- Create: `apps/web/src/app/features/conversations/data/conversations.facade.ts`
- Create: `apps/web/src/app/features/conversations/data/conversations.facade.spec.ts`
- Create: `apps/web/tests/contract/conversation-events.contract.spec.ts`

**Interfaces:**
- Consumes: snapshots paginados BE-006 e eventos `message.created.v1`,
  `message.status.v1`, `conversation.updated.v1`, `contact.block_changed.v1`.
- Produces: estado canônico `{items, selectedId, messagesByConversation,
  cursors, connection, syncState}`.
- Invariant: evento somente invalida/aplica versão válida; gap provoca snapshot.

- [ ] **Step 1: escrever contract tests antes do adapter**

Validar envelope, versão, campos obrigatórios e rejeição de evento desconhecido,
grande demais ou fora da permissão. Fixtures são copiadas dos contracts e não
inventadas pelo frontend.

- [ ] **Step 2: executar Red**

Run: `npm run test:contract -w apps/web -- conversation-events.contract.spec.ts`

Expected: FAIL porque parser/adapter ainda não existem.

- [ ] **Step 3: implementar porta e adapter mínimo**

Conectar com access token em memória, origin/path de runtime config e lifecycle
explícito. Não emitir comandos de domínio. Token expirado fecha, refresh conclui
e então reconecta; listeners são removidos no teardown.

- [ ] **Step 4: escrever testes Red de ordenação/recovery**

Cobrir evento duplicado, fora de ordem, gap de `aggregateVersion`, reconexão,
snapshot mais novo, paginação por cursor e troca de conversa durante request.

- [ ] **Step 5: implementar facade mínima**

Normalizar entidades, abortar respostas obsoletas por chave de request e
reconciliar versão. Dedupe por IDs/eventId; nunca usar horário do cliente para
ordenar mensagens confirmadas.

- [ ] **Step 6: verificar**

Run: `npm run test -w apps/web -- conversations.facade.spec.ts socket-io.adapter.spec.ts && npm run test:contract -w apps/web`

- [ ] **Step 7: commit e checkpoint**

```bash
git add apps/web/src/app/core/realtime apps/web/src/app/features/conversations/data apps/web/tests/contract
git commit -m "feat(FE-003): reconcile conversations in realtime"
```

Checkpoint: fault injection confirma que Pub/Sub perdido não perde estado.

---

### Task 5: FE-003 — Caixa compartilhada e envio de texto

**Preconditions:** Task 4 revisada.

**Files:**
- Create: `apps/web/src/app/features/conversations/pages/inbox-page.component.*`
- Create: `apps/web/src/app/features/conversations/ui/conversation-list.component.*`
- Create: `apps/web/src/app/features/conversations/ui/timeline.component.*`
- Create: `apps/web/src/app/features/conversations/ui/text-composer.component.*`
- Create: `apps/web/src/app/features/conversations/ui/conversation-details.component.*`
- Create: `apps/web/src/app/features/conversations/ui/*.spec.ts`
- Create: `apps/web/src/app/features/conversations/data/draft.store.ts`
- Test: `apps/web/tests/e2e/conversations-text.spec.ts`
- Modify: `apps/web/src/app/features/conversations/conversations.routes.ts`

**Interfaces:**
- UI inputs: view models imutáveis; outputs expressam intenção, nunca DTO HTTP.
- Commands: fixar, arquivar, reabrir, fechar, pausar IA, bloquear e enviar texto
  usam operação explícita/idempotency key; nenhum toggle cego.
- Draft: por conversa, apagado após confirmação ou logout.

- [ ] **Step 1: escrever component tests Red**

Cobrir loading/vazio/erro/degradado, seleção, busca, filtros, item fixado,
autoria, status confirmado, contato bloqueado, Enter enviar, Shift+Enter quebrar,
foco e conteúdo HTML exibido literalmente.

- [ ] **Step 2: implementar lista/timeline stateless**

Usar `input.required`, `output`, `track` por ID, OnPush e landmarks. Não importar
facade nos componentes. Virtualização só entra se o teste de volume justificar.

- [ ] **Step 3: testar envio idempotente antes do composer**

Dois submits durante request devem compartilhar `operationId`; falha recuperável
preserva texto; bloqueio recebido durante digitação impede outbound e explica
como resolver.

- [ ] **Step 4: implementar page/facade/composer mínimo**

Page conecta outputs à facade. Criar item local somente com estado `submitting`;
substituir pelo DTO confirmado. Não chamar `sent` antes do backend.

- [ ] **Step 5: responsividade e acessibilidade**

Desktop em três regiões; tablet reduz detalhe; mobile alterna lista/conversa com
back previsível. Preservar seleção, scroll e rascunho. Validar teclado e leitor.

- [ ] **Step 6: E2E multiusuário e verificação**

Run: `npm run test -w apps/web && npm run e2e -w apps/web -- conversations-text.spec.ts && npm run build -w apps/web`

- [ ] **Step 7: commit e checkpoint**

```bash
git add apps/web/src/app/features/conversations apps/web/tests/e2e/conversations-text.spec.ts
git commit -m "feat(FE-003): deliver shared text inbox"
```

Checkpoint: operação compara fluxo Angular com Golden Master e aprova mudanças
intencionais antes de habilitar `/app/conversas`.

---

### Task 6: FE-004 — Imagem, áudio, documento e segurança de mídia

**Preconditions:** FE-004 `APPROVED`; BE-010 integrado; texto permanece fallback.

**Files:**
- Create: `apps/web/src/app/features/media/data/media.models.ts`
- Create: `apps/web/src/app/features/media/data/media.facade.ts`
- Create: `apps/web/src/app/features/media/data/object-url.registry.ts`
- Create: `apps/web/src/app/features/media/data/*.spec.ts`
- Create: `apps/web/src/app/features/media/ui/media-bubble.component.*`
- Create: `apps/web/src/app/features/media/ui/upload-dialog.component.*`
- Create: `apps/web/src/app/features/media/ui/audio-recorder.component.*`
- Create: `apps/web/src/app/features/media/ui/*.spec.ts`
- Test: `apps/web/tests/e2e/media.spec.ts`

**Interfaces:**
- Consumes: upload multipart, cancelamento, download autenticado e estados
  `preparing`, `quarantined`, `clean`, `rejected`, `unsupported`, `failed`.
- Produces: progress/cancel via RxJS e registry que revoga toda object URL.

- [ ] **Step 1: escrever testes Red de lifecycle/segurança**

Cobrir arquivo desconhecido, MIME divergente, limite preliminar, cancelamento,
teardown, mídia rejeitada, download expirado e falha isolada do histórico.

- [ ] **Step 2: implementar registry e upload mínimo**

Centralizar `URL.createObjectURL/revokeObjectURL`; abortar request e preview no
cancelamento. O limite do cliente é UX, nunca autorização.

- [ ] **Step 3: testar e implementar bolhas por estado**

Somente `clean` pode exibir/baixar conforme contrato. Nome, MIME e tamanho ficam
sanitizados; formato desconhecido nunca abre inline.

- [ ] **Step 4: testar e implementar gravação de áudio**

Cobrir permissão negada, dispositivo ausente, start/stop, revisão, descarte,
teardown de tracks e envio. Negar microfone não quebra o compositor textual.

- [ ] **Step 5: verificar**

Run: `npm run test -w apps/web -- media && npm run e2e -w apps/web -- media.spec.ts && npm run build -w apps/web`

- [ ] **Step 6: commit e checkpoint**

```bash
git add apps/web/src/app/features/media apps/web/tests/e2e/media.spec.ts
git commit -m "feat(FE-004): add safe conversation media"
```

Checkpoint: flags independentes por imagem/áudio/documento; falha de mídia não
desabilita texto.

---

### Task 7: FE-005 — Campanhas, seleção e progresso verdadeiro

**Preconditions:** FE-005 `APPROVED`; BE-009 integrado.

**Files:**
- Create: `apps/web/src/app/features/campaigns/campaigns.routes.ts`
- Create: `apps/web/src/app/features/campaigns/data/recipient-parser.ts`
- Create: `apps/web/src/app/features/campaigns/data/recipient-parser.spec.ts`
- Create: `apps/web/src/app/features/campaigns/data/campaigns.facade.ts`
- Create: `apps/web/src/app/features/campaigns/data/campaigns.facade.spec.ts`
- Create: `apps/web/src/app/features/campaigns/pages/`
- Create: `apps/web/src/app/features/campaigns/ui/`
- Test: `apps/web/tests/e2e/campaigns.spec.ts`
- Modify: `apps/web/src/app/app.routes.ts`

**Interfaces:**
- Parser aceita vírgula/quebra de linha, normaliza apresentação, identifica
  inválidos e deduplica junto à seleção de conversas.
- Backend permanece autoridade de E.164/elegibilidade e gate 12–18 segundos.
- Progresso combina snapshot REST e `campaign.progress.v1` sem contagem otimista.

- [ ] **Step 1: property/unit tests Red do parser**

Cobrir espaços, máscaras, vírgulas, linhas, duplicatas, vazio, caracteres
inválidos e mesmo destinatário vindo de texto/seleção. Exigir 100% de branches
no parser puro.

- [ ] **Step 2: implementar parser mínimo e UI stateless de chips**

Preservar entrada original para correção, mostrar duplicata/razão e nunca afirmar
que número é WhatsApp válido antes da validação do servidor.

- [ ] **Step 3: escrever testes Red de revisão/idempotência**

Cobrir revisão obrigatória, bloqueados inelegíveis, duplo submit com mesma chave,
permissões de pause/resume/cancel e campanha de outro agente.

- [ ] **Step 4: implementar wizard e facade**

Etapas: destinatários, conteúdo/mídia permitida, revisão, confirmação. Exibir que
o intervalo é servidor-controlado e não oferecer campo de bypass.

- [ ] **Step 5: testar recovery de progresso**

Desconectar Socket.IO, avançar campanha no fake server, reconectar e provar que
snapshot corrige progresso sem reiniciar ou duplicar.

- [ ] **Step 6: verificar**

Run: `npm run test -w apps/web -- campaigns && npm run e2e -w apps/web -- campaigns.spec.ts && npm run build -w apps/web`

- [ ] **Step 7: commit e checkpoint**

```bash
git add apps/web/src/app/features/campaigns apps/web/src/app/app.routes.ts apps/web/tests/e2e/campaigns.spec.ts
git commit -m "feat(FE-005): add controlled campaign workflow"
```

Checkpoint: operação valida seleção, confirmação e leitura do progresso antes de
habilitar `/app/disparos`.

---

### Task 8: FE-006 — Estoque, lembretes e configuração

**Preconditions:** FE-006 `APPROVED`; BE-005 e BE-008 integrados.

**Files:**
- Create: `apps/web/src/app/features/operations/operations.routes.ts`
- Create: `apps/web/src/app/features/operations/inventory/`
- Create: `apps/web/src/app/features/operations/reminders/`
- Create: `apps/web/src/app/features/operations/settings/`
- Create: `apps/web/src/app/features/operations/contacts/`
- Test: `apps/web/tests/e2e/operations.spec.ts`
- Modify: `apps/web/src/app/app.routes.ts`

**Interfaces:**
- Edições versionadas enviam `version` e tratam Problem Details/409.
- Preço usa valor decimal do contrato; formatação pt-BR não vira ponto flutuante
  intermediário silencioso.
- Data/hora sempre apresenta timezone e converte instante explicitamente.

- [ ] **Step 1: escrever testes Red dos tipos perigosos**

Cobrir preço pt-BR, saldo, validade, UTC↔America/Sao_Paulo, versão concorrente,
config/prompt dirty state e erro recuperável preservando formulário.

- [ ] **Step 2: implementar facades e formulários mínimos**

Separar cada domínio em rota lazy. Reactive Forms tipados, DTO mapping puro e
states explícitos. Nenhum formulário compartilha store global sem necessidade.

- [ ] **Step 3: tratar conflito antes da edição completa**

Testar 409 com dados atuais; apresentar diferenças e ação consciente de reaplicar.
Nunca sobrescrever automaticamente a versão mais nova.

- [ ] **Step 4: implementar semântica visual acessível**

Estoque mínimo/vencido usa texto+ícone além de cor. Prompt nunca é HTML. Horário
de lembrete informa timezone e confirmação do instante salvo.

- [ ] **Step 5: verificar**

Run: `npm run test -w apps/web -- operations && npm run e2e -w apps/web -- operations.spec.ts && npm run build -w apps/web`

- [ ] **Step 6: commit e checkpoint**

```bash
git add apps/web/src/app/features/operations apps/web/src/app/app.routes.ts apps/web/tests/e2e/operations.spec.ts
git commit -m "feat(FE-006): migrate operational administration"
```

Checkpoint: promover flags por rota, nunca o módulo administrativo inteiro.

---

### Task 9: FE-007 — Usuários, auditoria e painel SUPPORT sanitizado

**Preconditions:** FE-007 `APPROVED`; BE-004 integrado.

**Files:**
- Create: `apps/web/src/app/features/users/users.routes.ts`
- Create: `apps/web/src/app/features/users/data/`
- Create: `apps/web/src/app/features/users/pages/`
- Create: `apps/web/src/app/features/users/ui/`
- Create: `apps/web/src/app/features/support/support.routes.ts`
- Create: `apps/web/src/app/features/support/data/`
- Create: `apps/web/src/app/features/support/pages/`
- Test: `apps/web/tests/e2e/users-admin.spec.ts`
- Test: `apps/web/tests/e2e/support-isolation.spec.ts`
- Modify: `apps/web/src/app/app.routes.ts`

**Interfaces:**
- ADMIN gerencia usuários e lê auditoria autorizada.
- SUPPORT recebe somente health/filas/versões/métricas sanitizadas.
- Código/correlation ID pode aparecer; stack, token, PII e payload não.

- [ ] **Step 1: escrever matriz Red de rota/request**

Para ADMIN/AGENT/SUPPORT, verificar route guards e requests emitidas. O cenário
SUPPORT navega por toda a aplicação e falha se qualquer endpoint de conversa,
mensagem, mídia, prompt ou QR for chamado.

- [ ] **Step 2: implementar rotas lazy separadas**

Não importar feature de conversa no bundle SUPPORT. Menus derivam permissões,
mas testes também confirmam 403 do backend como barreira final.

- [ ] **Step 3: testar e implementar gestão de usuário**

Cobrir criar/editar/bloquear/desbloquear, confirmação com impacto, motivo,
encerramento de sessão e atualização por snapshot/evento.

- [ ] **Step 4: testar e implementar observabilidade**

Estados `healthy`, `degraded`, `unavailable`, `unknown`; indisponível nunca é
zero. Verificar DOM, console, tooltip e traces contra fixtures sensíveis.

- [ ] **Step 5: verificar**

Run: `npm run test -w apps/web -- users support && npm run e2e -w apps/web -- users-admin.spec.ts support-isolation.spec.ts && npm run build -w apps/web`

- [ ] **Step 6: commit e checkpoint**

```bash
git add apps/web/src/app/features/users apps/web/src/app/features/support apps/web/src/app/app.routes.ts apps/web/tests/e2e
git commit -m "feat(FE-007): add users and safe support views"
```

Checkpoint: revisão de segurança inspeciona requests e bundles do papel SUPPORT.

---

### Task 10: FE-008 — Hardening, WCAG e budgets

**Preconditions:** FE-008 `APPROVED`; FE-003..FE-007 nos seus gates internos.

**Files:**
- Create: `apps/web/tests/security/xss.spec.ts`
- Create: `apps/web/tests/security/csp.spec.ts`
- Create: `apps/web/tests/security/redaction.spec.ts`
- Create: `apps/web/tests/accessibility/keyboard.spec.ts`
- Create: `apps/web/tests/accessibility/axe.spec.ts`
- Create: `apps/web/tests/performance/bundle-budget.spec.ts`
- Create: `apps/web/tests/performance/lazy-manifest.spec.ts`
- Create: `apps/web/docs/parity-report.md`
- Modify: `apps/web/angular.json`
- Modify: `apps/web/src/styles/tokens.css`

**Interfaces:**
- Produces: gates executáveis `test:security`, `test:a11y`, `test:performance`.
- Initial JS budget: warning em 300 kB e erro em 400 kB comprimidos; qualquer
  ajuste exige evidência e aprovação na spec.
- Produces: matriz 360×800, 768×1024 e 1440×900.

- [ ] **Step 1: escrever testes Red com payloads hostis**

Mensagens, nomes, filenames, prompts e erros incluem HTML/script/URLs perigosas.
Testar DOM, navegação, console e CSP. Falhar em `innerHTML`, bypass ou asset CDN.

- [ ] **Step 2: corrigir somente regressões demonstradas**

Aplicar binding seguro, URL registry, headers/config necessários e redaction.
CSP começa report-only no ambiente interno e só vira enforce após relatório.

- [ ] **Step 3: executar auditoria completa de teclado/axe**

Login, conversa, texto, mídia, bloqueio, campanha e operação administrativa devem
concluir por teclado, com foco previsível, nomes acessíveis, contraste AA e
reduced motion.

- [ ] **Step 4: fixar budgets e lazy boundaries**

Analisar manifesto. Falhar se campaigns/operations/users/support/media entrarem
no initial chunk ou se dependência pesada duplicar entre chunks.

- [ ] **Step 5: comparar Golden Master e escrever paridade**

Para cada diferença, registrar `preservada`, `corrigida` ou `adiada`, spec e
evidência. Nenhuma atualização automática de screenshots em CI.

- [ ] **Step 6: verificar gate agregado**

Run: `npm run lint -w apps/web && npm run test -w apps/web && npm run test:contract -w apps/web && npm run test:security -w apps/web && npm run test:a11y -w apps/web && npm run test:performance -w apps/web && npm run e2e -w apps/web && npm run build -w apps/web`

- [ ] **Step 7: commit e checkpoint**

```bash
git add apps/web/angular.json apps/web/src/styles apps/web/tests apps/web/docs/parity-report.md
git commit -m "test(FE-008): enforce frontend quality gates"
```

Checkpoint: acessibilidade, segurança e performance revisadas antes de qualquer
mudança na rota raiz.

---

### Task 11: FE-009 — Cutover reversível do frontend

**Preconditions:** FE-009 `APPROVED`; FE-008 e BE-012 verificados; janela e
operadores definidos.

**Files:**
- Create: `apps/web/docs/release-runbook.md`
- Create: `apps/web/docs/rollback-runbook.md`
- Create: `apps/web/tests/release/nginx-routing.spec.ts`
- Create: `apps/web/tests/release/version-skew.spec.ts`
- Create: `apps/web/tests/release/rollback.spec.ts`
- Modify: `deploy/nginx/hubbie.conf`
- Modify: `deploy/scripts/release.sh`
- Modify: `deploy/scripts/rollback.sh`
- Modify: `deploy/scripts/smoke.sh`
- Delete later: `index.html`, `login.html` e handlers/assets legados somente em
  release separada após a janela de observação

**Interfaces:**
- `/` aponta ao Angular após promoção; `/legacy` continua autenticado.
- Assets possuem hash/cache imutável; HTML/runtime config usam no-cache adequado.
- Rollback de rota não requer rebuild nem migration.

- [ ] **Step 1: escrever testes Red de roteamento/rollback**

Cobrir deep link SPA, `/legacy`, headers, chunk antigo, config incompatível e
troca de `/` de volta ao legado sem alteração de banco.

- [ ] **Step 2: implementar configuração em ambiente de homologação**

Servir build versionado, fallback apenas para rotas SPA e preservar endpoints.
Não aplicar em produção nesta etapa.

- [ ] **Step 3: testar version skew e aba antiga**

Deployar build B sobre aba A no harness; chunk ausente oferece reload controlado
sem loop e preserva rascunho quando tecnicamente possível.

- [ ] **Step 4: ensaiar smoke e rollback**

Executar login por papel, conversa/texto, mídia, campanha, administração, health,
refresh, realtime reconnect e rollback. Registrar tempo, operador e evidência.

- [ ] **Step 5: obter autorização de promoção**

Apresentar métricas/erros, gates FE-008, compatibilidade, backup e rollback. A
mudança produtiva só ocorre após aprovação explícita do responsável.

- [ ] **Step 6: observar e remover legado em release distinta**

Durante a janela, manter `/legacy`. Depois de aprovação separada, escrever teste
de ausência de referências, remover arquivos/handlers e repetir smoke/rollback.

- [ ] **Step 7: verificar e commit de configuração**

Run: `npm run verify -w apps/web && npm run test:release -w apps/web`

```bash
git add apps/web/docs apps/web/tests/release deploy/nginx/hubbie.conf deploy/scripts/release.sh deploy/scripts/rollback.sh deploy/scripts/smoke.sh
git commit -m "ops(FE-009): prepare reversible Angular cutover"
```

Checkpoint: o commit prepara o cutover; não executa deploy nem promoção.

## Gate final do PLAN-FE-01

O plano está concluído somente quando:

- FE-001..FE-009 estão `VERIFIED` e integradas em `dev` na ordem de dependência;
- todos os comandos de FE-008 e FE-009 passam em resultado fresco;
- contratos gerados não têm drift em relação a `packages/contracts`;
- nenhuma credencial, token, PII, mensagem, prompt ou mídia aparece em log/build;
- Golden Master e relatório de paridade têm revisão humana;
- cada rota possui flag e rollback ensaiado;
- `/legacy` só é removido em release posterior ao cutover observado.

## Ordem de retomada

Na próxima sessão, selecionar exatamente uma task cuja spec e dependências estejam
aprovadas. O primeiro candidato é **Task 1 / FE-001**, pois caracteriza o legado
sem alterar produção. Após a escolha, usar `executing-plans`, criar a worktree e
parar no checkpoint descrito na própria task.
