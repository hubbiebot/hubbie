# FE-002 — Login, sessão e shell

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-001, BE-003

## Objetivo

Implementar login, bootstrap obrigatório, access token em memória, refresh por
cookie HttpOnly e shell autorizado por papel.

## Escopo

- Login, troca inicial de credenciais, logout e expiração.
- Session facade com `accessToken`, `expiresIn`, usuário, papel e permissões.
- Interceptor Bearer, refresh single-flight e proteção contra loop.
- Guards por autenticação/permissão e navegação diferente por papel.
- Status da API/WhatsApp sem QR para papéis não autorizados.

## Requisitos

- **FE002-R01:** access token não entra em local/session storage.
- **FE002-R02:** frontend nunca lê o refresh cookie.
- **FE002-R03:** múltiplos 401 provocam um único refresh concorrente.
- **FE002-R04:** bloqueio/logout limpam memória e navegam ao login.
- **FE002-R05:** menu oculto não substitui autorização do backend.
- **FE002-R06:** após o corte, `/app` e `/legacy` compartilham a família de
  refresh; o legado não depende de `connect.sid`.

## Cenários de aceite

```gherkin
Given sessão expirada com várias requisições concorrentes
When todas recebem 401
Then apenas um refresh ocorre e as demais aguardam seu resultado

Given usuário mustChangeCredentials
When autentica
Then só acessa troca inicial e logout até concluir

Given SUPPORT
When o shell carrega
Then não há rota ou dado de conversa, mídia, prompt ou QR
```

## TDD e evidências

Testes primeiro para facade/interceptor/guards, depois UI. Playwright cobre login,
troca inicial, refresh, bloqueio e expiração.

## Rollout e rollback

O corte invalida a sessão Express e exige reautenticação uma vez. Depois, ambos
os frontends usam o mesmo refresh e logout/revogação. Promoção exige testes em
`/app` e `/legacy`; rollback troca somente a rota Nginx.
