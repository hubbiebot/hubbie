# BE-001 — Fundação do monorepo Express

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Tipo:** backend / fundação

## Objetivo

Criar a fundação JavaScript ESM do monorepo, com Express 5, configuração segura,
qualidade automatizada e processos vazios de API/workers, sem migrar regra de
negócio.

## Escopo

- Workspaces `apps/api`, `apps/worker`, `apps/media-worker` e `packages/*`.
- Node.js LTS fixado, JavaScript ESM, ESLint, Prettier e testes.
- Express 5 com routers, controllers, services e repositories por módulo.
- Middlewares de `requestId`, JSON 256 KB, erros RFC 9457, Helmet, CORS allowlist
  e logs JSON redigidos.
- Configuração validada e fail-fast; segredos lidos de arquivos/credentials.
- `/health/live`, `/health/ready` e esqueleto OpenAPI 3.1.
- Shutdown gracioso e scripts separados para API e workers.

## Fora do escopo

Banco funcional, autenticação, Socket.IO, WhatsApp e frontend.

## Requisitos

- **BE001-R01:** nenhum segredo ou credencial padrão entra no Git.
- **BE001-R02:** erro inesperado não retorna stack trace ou dados internos.
- **BE001-R03:** dependência indisponível deve afetar readiness, não liveness.
- **BE001-R04:** módulos não podem importar internals de outro módulo.
- **BE001-R05:** o processo encerra aceitação de tráfego antes de finalizar.

## Cenários de aceite

```gherkin
Given uma variável obrigatória ausente
When a API inicia
Then ela termina com código não zero e log sanitizado

Given um handler assíncrono lança um erro
When a rota é chamada
Then a resposta segue Problem Details e não contém stack trace

Given SIGTERM
When a API está saudável
Then readiness falha e o servidor encerra dentro do timeout configurado
```

## Matriz requisito-teste

| Requisito | Evidência |
|---|---|
| R01 | secret scan e teste de configuração |
| R02 | integração do error middleware |
| R03 | integração de health checks |
| R04 | lint de boundaries |
| R05 | teste de shutdown |

## Rollout e rollback

Não recebe tráfego funcional. Rollback remove o novo processo sem afetar
`index.js`. Pronto quando lint, testes, build/check e smoke local passam.
