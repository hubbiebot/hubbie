# BE-007 — Socket.IO, WSS e Redis Pub/Sub

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Depende de:** BE-003, BE-006

## Objetivo

Entregar eventos em tempo real autenticados e autorizados sem usar Socket.IO
para mutações ou para controlar o ritmo de campanhas.

## Escopo

- Gateway Socket.IO no mesmo servidor HTTP da API.
- JWT no handshake, Origin allowlist e revalidação de `auth_version`.
- Salas calculadas no servidor: usuário, papel, conversa e campanha.
- Redis Adapter com clientes/ACLs de Pub/Sub dedicados.
- Relay da `domain_event_outbox` e schemas de eventos versionados.
- Reconexão por snapshot/cursor REST, heartbeat e backpressure.

## Requisitos

- **BE007-R01:** produção aceita somente WSS/TLS 1.3 via Nginx.
- **BE007-R02:** cliente nunca entra em sala por nome arbitrário.
- **BE007-R03:** `SUPPORT` não recebe sala/payload de conteúdo.
- **BE007-R04:** bloqueio/logout fecham sockets do usuário.
- **BE007-R05:** Pub/Sub perdido não perde estado autoritativo.
- **BE007-R06:** payload máximo 64 KB, compressão desligada e rate limit.
- **BE007-R07:** eventos saem somente depois do commit da outbox.

## Cenários de aceite

```gherkin
Given JWT válido sem acesso à conversa
When o cliente solicita sua sala
Then a associação é recusada e auditada sem revelar conteúdo

Given Redis Pub/Sub indisponível
When o estado muda no MySQL
Then o commit permanece válido e o cliente recupera snapshot após reconectar

Given usuário bloqueado com sockets em múltiplas abas
When user.status_changed é processado
Then todas as conexões daquele authVersion são fechadas
```

## Testes obrigatórios

Handshake, Origin/CSWSH, matriz sala/permissão, expiração/reconexão, payload flood,
queda Redis e consistência de snapshot/event version.

## Rollout e rollback

Executar namespace novo ao lado dos eventos legados. O adapter do frontend pode
voltar ao namespace antigo por feature flag.
