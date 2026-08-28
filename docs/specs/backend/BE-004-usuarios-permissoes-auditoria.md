# BE-004 — Usuários, permissões e auditoria

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Depende de:** BE-003

## Objetivo

Implementar gestão de usuários, RBAC por permissões, bloqueio imediato de
atendentes, auditoria append-only e visão sanitizada de suporte.

## Escopo

- CRUD controlado de `AGENT` e `SUPPORT` pelo único `ADMIN` ativo.
- Papéis `ADMIN`, `AGENT`, `SUPPORT` e permissions centralizadas.
- Bloqueio/desbloqueio de `AGENT`, revogação e desconexão por evento.
- Auditoria de autenticação, leitura, envio, exclusão e mutações críticas.
- Health/metrics DTO exclusivo para `SUPPORT`, sem conteúdo/PII.

## Requisitos

- **BE004-R01:** toda rota de domínio declara permissão e autorização por objeto.
- **BE004-R02:** `SUPPORT` nunca obtém mensagens, mídias, prompts, QR ou PII.
- **BE004-R03:** bloquear usuário incrementa `auth_version` e revoga refresh.
- **BE004-R04:** jobs pendentes criados pelo bloqueado são cancelados.
- **BE004-R05:** auditoria não aceita update/delete pelo usuário SQL da app.
- **BE004-R06:** logs/auditoria nunca recebem tokens ou payload sensível.
- **BE004-R07:** a API não cria/promove um segundo `ADMIN` no MVP.

## Cenários de aceite

```gherkin
Given um AGENT ativo com JWT e socket
When o ADMIN o bloqueia
Then refresh é revogado, JWT falha, socket fecha e jobs pendentes são cancelados

Given um SUPPORT autenticado
When tenta acessar conversa, mídia ou prompt por ID conhecido
Then recebe 403 e nenhuma diferença revela a existência do conteúdo
```

## Testes obrigatórios

Matriz papel × rota × objeto, revogação concorrente, redaction tests, tentativa
de alteração da auditoria e snapshot do DTO SUPPORT.

## Rollout e rollback

Ativar primeiro somente para administradores internos da instalação. Rollback
desliga novas rotas, sem reativar usuários bloqueados automaticamente.
