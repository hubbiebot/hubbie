# BE-001 simplificada — Fundação Express e OpenAPI

**Estado:** proposta para revisão humana  
**Escopo:** somente a fundação da API. Não migra regras do legado, banco, autenticação, Socket.IO ou WhatsApp.

## Objetivo

Disponibilizar uma API Express 5 em JavaScript ESM, isolada do processo legado,
com contrato OpenAPI 3.1 como fonte de documentação e Swagger UI exclusivo de
desenvolvimento.

## Decisões

- O contrato vive em `packages/contracts/openapi/openapi.yaml`.
- A interface Swagger é servida apenas quando `NODE_ENV=development`, em
  `GET /api-docs`; ela não é registrada em produção.
- As rotas de domínio futuras usarão o prefixo `/api/v1`.
- Health checks são públicos e independentes: `GET /health/live` informa que o
  processo está vivo; `GET /health/ready` informa se dependências exigidas
  estão prontas.
- A aplicação usa `requestId`, limite JSON de 256 KB, Helmet, CORS por
  allowlist, logs estruturados redigidos e respostas de erro RFC 9457.
- Configuração obrigatória é validada antes de abrir a porta; nenhum segredo
  tem valor padrão nem é escrito em logs.

## Estrutura

```text
apps/api/
  src/app.js                         composição do Express
  src/server.js                      porta e shutdown gracioso
  src/middlewares/                   request ID e tratamento de erros
  src/modules/health/                rotas de health
  test/                              integração HTTP
packages/contracts/openapi/
  openapi.yaml                       contrato OpenAPI 3.1
packages/shared/
  src/config/                        configuração validada
  src/logging/                       logger com redação
```

## Fluxo HTTP

```text
request -> requestId -> headers/CORS -> JSON 256 KB -> router
        -> controller -> erro RFC 9457 com requestId
```

O Swagger UI lê apenas o arquivo OpenAPI. Controllers não geram nem contêm
anotações Swagger.

## Segurança e operação

- Swagger não existe em produção.
- Logs não registram senha, token, telefone, mensagem ou prompt.
- Erros inesperados retornam Problem Details sem stack trace.
- No recebimento de SIGTERM, readiness passa a falhar antes do fechamento do
  servidor.
- A fundação nova não recebe tráfego funcional e não altera `index.js` nem os
  arquivos legados.

## Testes de aceite

1. `GET /health/live` retorna 200 mesmo sem dependências prontas.
2. `GET /health/ready` retorna 503 quando a verificação de dependências falha.
3. Erro de rota assíncrona retorna Problem Details sem stack e com request ID.
4. Payload JSON acima de 256 KB retorna 413.
5. Swagger está acessível em desenvolvimento e ausente em produção.
6. O arquivo OpenAPI 3.1 é sintaticamente válido e documenta health e erros.
7. Configuração obrigatória ausente impede a inicialização com log sanitizado.

## Rollback

Remover ou parar o processo novo não interfere em `index.js`, no frontend ou
nos JSONs legados. Não há migration nem dado de negócio nesta etapa.

## Fora do escopo

MySQL, Redis, BullMQ, login, RBAC, importação, Socket.IO, upload, mídia,
campanhas, WhatsApp e frontend Angular.
