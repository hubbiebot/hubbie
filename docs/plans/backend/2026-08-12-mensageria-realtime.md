# Mensageria, Realtime e Campanhas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir a caixa compartilhada, ordenar mensagens, publicar eventos Socket.IO confiáveis e executar lembretes/campanhas resilientes com BullMQ.

**Architecture:** REST persiste comandos e outbox em transações MySQL. Relays criam jobs BullMQ e eventos Socket.IO; workers carregam conteúdo por ID e revalidam autorização/estado antes de efeitos. Redis acelera e transporta, mas MySQL permanece autoritativo.

**Tech Stack:** Express 5, TypeORM/MySQL 8, Redis 7, BullMQ, Socket.IO, `@socket.io/redis-adapter`, ioredis, Ajv, Vitest, Supertest.

## Global Constraints

- Specs BE-006..BE-009 devem estar `APPROVED` antes da task correspondente.
- Jobs contêm IDs opacos, nunca corpo, telefone, prompt, token ou mídia.
- Socket.IO é server push; comandos mutáveis continuam REST.
- WSS/TLS 1.3 termina no Nginx; Redis Adapter usa ACL/loopback.
- Ordenação é por conversa; exatamente uma vez externo não é prometido.
- Campanhas têm gate global e intervalo aleatório inclusivo entre 12 e 18 s.
- Toda task segue Red → Green → Refactor, revisão e commit próprio.

## Mapa de arquivos

```text
apps/api/src/modules/conversations/*       leitura e estados da conversa
apps/api/src/modules/messages/*            ingestão/outbound/exclusão
apps/api/src/realtime/*                    gateway, auth, rooms e schemas
apps/worker/src/queues/*                    configuração BullMQ
apps/worker/src/processors/*                consumers por responsabilidade
apps/worker/src/relays/*                    outbox para Redis/BullMQ
packages/contracts/events/*                 eventos Socket.IO versionados
packages/contracts/jobs/*                   schemas mínimos de jobs
```

---

### Task 1: BE-006 — Histórico, paginação e autoria

**Files:**
- Create: `apps/api/src/modules/conversations/conversations.routes.js`
- Create: `apps/api/src/modules/conversations/conversations.controller.js`
- Create: `apps/api/src/modules/conversations/conversations.service.js`
- Create: `apps/api/src/modules/conversations/conversations.repository.js`
- Create: `apps/api/src/modules/messages/messages.routes.js`
- Create: `apps/api/src/modules/messages/messages.service.js`
- Test: `apps/api/test/conversations.integration.test.js`
- Test: `apps/api/test/messages-ordering.integration.test.js`

**Interfaces:**
- Produces: `listConversations({ actor, filter, cursor, limit }) -> Page<ConversationSummary>`
- Produces: `listMessages({ actor, conversationId, before, limit }) -> Page<MessageDto>`
- Produces: `scheduleOutbound({ actor, conversationId, content, operationId }) -> MessageDto`

- [ ] **Step 1: escrever teste de cursor estável**

```js
const page1 = await conversations.list({ actor, limit: 2 });
await insertNewerConversation();
const page2 = await conversations.list({ actor, limit: 2, cursor: page1.nextCursor });
expect(intersectionIds(page1.items, page2.items)).toEqual([]);
```

- [ ] **Step 2: executar Red**

Run: `npm run test:integration -w apps/api -- conversations.integration.test.js`

Expected: módulo/rota inexistente.

- [ ] **Step 3: implementar query mínima por keyset**

Ordenar por `updated_at DESC, id DESC`; cursor assinado/codificado contém ambos.
Repository nunca retorna ciphertext; Service autoriza e transforma DTO.

- [ ] **Step 4: escrever teste concorrente de sequência**

Criar duas mensagens em paralelo e esperar `outboundSeq` distintos/contíguos,
`sentByUserId` e `authorDisplayName` corretos.

- [ ] **Step 5: implementar transação de outbound**

Lock da conversa, incrementar sequência, cifrar conteúdo, inserir mensagem,
idempotency result, auditoria e task outbox na mesma transação.

- [ ] **Step 6: verificar autorização e redaction**

Run: `npm run test:integration -w apps/api -- conversations.integration.test.js messages-ordering.integration.test.js`

Adicionar casos SUPPORT=403, ID desconhecido uniforme, conteúdo ausente de logs.

- [ ] **Step 7: commit**

```bash
git add apps/api/src/modules/conversations apps/api/src/modules/messages apps/api/test
git commit -m "feat(BE-006): persist ordered shared conversations"
```

---

### Task 2: BE-006 — Bloqueio, automation epoch e exclusão

**Files:**
- Modify: `apps/api/src/modules/contacts/contacts.service.js`
- Modify: `apps/api/src/modules/messages/messages.service.js`
- Create: `apps/worker/src/processors/deletion.processor.js`
- Test: `apps/api/test/contact-block.integration.test.js`
- Test: `apps/api/test/message-deletion.integration.test.js`

**Interfaces:**
- Produces: `setContactBlocked({ actor, contactId, blocked, reason, operationId })`
- Produces: `requestDeletion({ actor, resourceType, resourceId, reason, operationId }) -> { deletionJobId }`

- [ ] **Step 1: teste falhando de invalidar IA**

```js
const before = await getConversation(id);
await contacts.setBlocked({ actor, contactId, blocked: true, reason: 'solicitação' });
const after = await getConversation(id);
expect(after.automationEpoch).toBe(before.automationEpoch + 1);
expect(await pendingOutboundCount(id)).toBe(0);
```

- [ ] **Step 2: executar Red e implementar bloqueio transacional**

Run: `npm run test:integration -w apps/api -- contact-block.integration.test.js`

Atualizar block history, epoch, cancelar outbounds/lembretes/recipients e criar
auditoria/outbox na mesma transação. Inbound continua aceito.

- [ ] **Step 3: teste falhando da exclusão 202/idempotente**

Repetir `DELETE` com a mesma idempotency key; esperar mesmo `deletionJobId`,
conteúdo invisível imediato e uma única task outbox.

- [ ] **Step 4: implementar tombstone e processor mínimo**

Service marca `deletion_requested_at`; processor apaga ciphertext/derivados por
ID, invalida cache e conserva tombstone sem conteúdo.

- [ ] **Step 5: verificar e commit**

Run: `npm run test:integration -w apps/api -- contact-block.integration.test.js message-deletion.integration.test.js`

```bash
git add apps/api/src/modules apps/worker/src/processors apps/api/test
git commit -m "feat(BE-006): block contacts and delete content safely"
```

---

### Task 3: BE-007 — Gateway Socket.IO autenticado

**Files:**
- Create: `apps/api/src/realtime/create-gateway.js`
- Create: `apps/api/src/realtime/authenticate-socket.js`
- Create: `apps/api/src/realtime/room-policy.js`
- Create: `apps/api/src/realtime/event-publisher.js`
- Create: `packages/contracts/events/whatsapp-status.v1.schema.json`
- Create: `packages/contracts/events/message-created.v1.schema.json`
- Create: `packages/contracts/events/message-status.v1.schema.json`
- Create: `packages/contracts/events/conversation-updated.v1.schema.json`
- Create: `packages/contracts/events/job-updated.v1.schema.json`
- Create: `packages/contracts/events/campaign-progress.v1.schema.json`
- Test: `apps/api/test/socket-authorization.integration.test.js`
- Test: `apps/api/test/socket-recovery.integration.test.js`

**Interfaces:**
- Produces: `createRealtimeGateway(httpServer, dependencies) -> SocketIOServer`
- Produces: `joinAuthorizedRoom(socket, roomRequest) -> Promise<void>`
- Produces: `publishDomainEvent(event) -> Promise<void>`

- [ ] **Step 1: teste falhando de handshake/origin**

```js
await expect(connectSocket({ token: validAgentToken, origin: 'https://evil.test' }))
  .rejects.toMatchObject({ message: 'not authorized' });
await expect(connectSocket({ token: null, origin: allowedOrigin }))
  .rejects.toMatchObject({ message: 'not authorized' });
```

- [ ] **Step 2: executar Red**

Run: `npm run test:integration -w apps/api -- socket-authorization.integration.test.js`

- [ ] **Step 3: implementar handshake mínimo**

Validar Origin por igualdade, JWT, usuário/`auth_version`, limite por IP+usuário.
Configurar `maxHttpBufferSize: 65536`, `perMessageDeflate: false`, ping e timeout.

- [ ] **Step 4: teste falhando de sala por objeto**

AGENT autorizado entra em `conversation:<id>`; outro AGENT sem permissão e
SUPPORT recebem erro uniforme. Nome de sala vindo do cliente nunca é usado.

- [ ] **Step 5: implementar room policy e Redis Adapter**

Criar nomes no servidor. Usar conexões ioredis distintas para pub/sub e ACLs
configuradas. Não incluir conteúdo em salas `role:SUPPORT`.

- [ ] **Step 6: teste/implementação de recovery**

Perder evento, reconectar, buscar snapshot REST com aggregateVersion e provar
ausência de duplicação. Queda Redis deve preservar commit MySQL.

- [ ] **Step 7: verificar e commit**

Run: `npm run test:integration -w apps/api -- socket-authorization.integration.test.js socket-recovery.integration.test.js`

```bash
git add apps/api/src/realtime packages/contracts/events apps/api/test
git commit -m "feat(BE-007): secure realtime events and rooms"
```

---

### Task 4: BE-008 — Transactional outbox e BullMQ

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/src/queues/create-queues.js`
- Create: `apps/worker/src/relays/task-outbox.relay.js`
- Create: `apps/worker/src/relays/domain-event.relay.js`
- Create: `apps/worker/src/jobs/job-claim.service.js`
- Create: `packages/contracts/jobs/send-message.v1.schema.json`
- Create: `packages/contracts/jobs/process-automation.v1.schema.json`
- Create: `packages/contracts/jobs/reminder-due.v1.schema.json`
- Create: `packages/contracts/jobs/bulk-dispatch.v1.schema.json`
- Create: `packages/contracts/jobs/process-media.v1.schema.json`
- Test: `apps/worker/test/task-outbox.integration.test.js`
- Test: `apps/worker/test/job-recovery.integration.test.js`

**Interfaces:**
- Produces: `relayTaskOutbox(batchSize) -> RelayResult`
- Produces: `claimJob(jobId, workerId, leaseMs) -> AsyncJob | null`
- Produces: BullMQ payload `{ asyncJobId, schemaVersion }`.

- [ ] **Step 1: teste falhando de Redis fora após commit**

```js
await createDomainCommandWithOutbox();
redisHarness.disconnect();
await expect(relay.relayTaskOutbox(10)).rejects.toThrow();
expect(await pendingOutboxCount()).toBe(1);
```

- [ ] **Step 2: executar Red e implementar relay mínimo**

Run: `npm run test:integration -w apps/worker -- task-outbox.integration.test.js`

Selecionar lote com lock/lease, validar job schema, adicionar com jobId
determinístico e marcar published somente depois da confirmação Redis.

- [ ] **Step 3: testar duplicação/recovery antes do claim**

Executar relay duas vezes, expirar lease e simular crash em `PROCESSING`. Esperar
um job lógico e retorno a `RETRY`/`PENDING` conforme tipo de falha.

- [ ] **Step 4: implementar claim e reconciliação mínimos**

Transição condicional SQL, attempt classification e heartbeat. Jobs continuam
sem conteúdo sensível.

- [ ] **Step 5: verificar e commit**

Run: `npm run test:integration -w apps/worker -- task-outbox.integration.test.js job-recovery.integration.test.js`

```bash
git add apps/worker packages/contracts/jobs
git commit -m "feat(BE-008): relay durable work through BullMQ"
```

---

### Task 5: BE-008 — Lembretes e lanes de automação

**Files:**
- Create: `apps/api/src/modules/reminders/reminders.routes.js`
- Create: `apps/api/src/modules/reminders/reminders.controller.js`
- Create: `apps/api/src/modules/reminders/reminders.service.js`
- Create: `apps/api/src/modules/reminders/reminders.repository.js`
- Create: `apps/api/src/modules/reminders/reminders.schemas.js`
- Create: `apps/worker/src/processors/reminder.processor.js`
- Create: `apps/worker/src/processors/automation.processor.js`
- Create: `apps/worker/src/queues/conversation-lane.js`
- Test: `apps/worker/test/reminders.integration.test.js`
- Test: `apps/worker/test/automation-ordering.integration.test.js`

**Interfaces:**
- Produces: `scheduleReminder({ actor, contactId, scheduledAt, content, operationId })`
- Produces: `conversationLane(conversationId, laneCount = 8) -> 0..7`

- [ ] **Step 1: teste falhando de timezone/cancelamento**

Criar lembrete para horário `America/Sao_Paulo`, verificar UTC persistido; bloquear
contato antes do processamento e esperar `CANCELED` sem tentativa externa.

- [ ] **Step 2: executar Red e implementar API/processor mínimo**

Run: `npm run test:integration -w apps/worker -- reminders.integration.test.js`

- [ ] **Step 3: teste falhando de ordenação por lane**

Enfileirar duas automações para a mesma conversa e uma para outra conversa;
provar ordem local e paralelismo entre lanes.

- [ ] **Step 4: implementar hash estável e concurrency 1**

Fixar oito lanes, guardar `automation_epoch` no async job e descartar resultado
se epoch ou resposta humana mudou antes do outbound.

- [ ] **Step 5: verificar e commit**

Run: `npm run test:integration -w apps/worker -- reminders.integration.test.js automation-ordering.integration.test.js`

```bash
git add apps/api/src/modules/reminders apps/worker/src packages/contracts
git commit -m "feat(BE-008): schedule resilient reminders and automation"
```

---

### Task 6: BE-009 — Campanhas com gate global 12–18 s

**Files:**
- Create: `apps/api/src/modules/campaigns/campaigns.routes.js`
- Create: `apps/api/src/modules/campaigns/campaigns.controller.js`
- Create: `apps/api/src/modules/campaigns/campaigns.service.js`
- Create: `apps/api/src/modules/campaigns/campaigns.repository.js`
- Create: `apps/api/src/modules/campaigns/campaigns.schemas.js`
- Create: `apps/worker/src/processors/bulk-dispatch.processor.js`
- Create: `apps/worker/src/services/bulk-gate.service.js`
- Test: `apps/api/test/campaigns.integration.test.js`
- Test: `apps/worker/test/bulk-gate.property.test.js`
- Test: `apps/worker/test/campaign-restart.integration.test.js`

**Interfaces:**
- Produces: `createCampaign({ actor, recipients, content, operationId }) -> CampaignDto`
- Produces: `claimBulkSlot({ installationId, now }) -> { recipientId, nextAt } | null`
- Produces: evento `campaign.progress.v1` agregado.

- [ ] **Step 1: teste falhando de normalização/deduplicação**

Enviar o mesmo E.164 via contato, número com máscara e duplicata; esperar um
recipient elegível e lista de entradas descartadas.

- [ ] **Step 2: executar Red e implementar create/start mínimo**

Run: `npm run test:integration -w apps/api -- campaigns.integration.test.js`

- [ ] **Step 3: property test antes do gate**

```js
fc.assert(fc.property(fc.integer({ min: 0, max: 10_000 }), seed => {
  const delay = jitter12To18Seconds(seed);
  expect(delay).toBeGreaterThanOrEqual(12_000);
  expect(delay).toBeLessThanOrEqual(18_000);
}));
```

- [ ] **Step 4: implementar gate transacional sem sleep**

Reservar globalmente o destinatário e avançar `next_bulk_send_at` em 12–18 s na
mesma transação, antes do efeito externo. Gravar `PREPARED`; imediatamente antes
do provider, validar fencing/lease e gravar `CALL_STARTED`. Crash em `PREPARED`
respeita o slot; crash em `CALL_STARTED` produz `UNKNOWN`. Nunca antecipar o gate
durante recovery.

Adicionar somente o próximo job delayed. Retry do recipient também passa pelo
gate e precisa obter uma nova reserva transacional.

- [ ] **Step 5: testar restart/duas campanhas/pause race**

Após reinício com vários vencidos, provar um único envio e novo delay. Pausar ou
bloquear no instante anterior ao efeito deve cancelar aquele recipient.

- [ ] **Step 6: verificar intervalo observado e commit**

Run: `npm run test:integration -w apps/worker -- bulk-gate.property.test.js campaign-restart.integration.test.js`

```bash
git add apps/api/src/modules/campaigns apps/worker/src apps/api/test apps/worker/test packages/contracts
git commit -m "feat(BE-009): dispatch campaigns through global gate"
```

## Checkpoint do plano

Antes de PLAN-BE-03:

- Ordering, outbox e recovery verificados com fault injection.
- Matriz Socket.IO aprovada e teste CSWSH/flood verde.
- Métrica de teste prova zero intervalo bulk abaixo de 12 s.
- Nenhum payload de Redis/BullMQ/PubSub contém dado sensível.
