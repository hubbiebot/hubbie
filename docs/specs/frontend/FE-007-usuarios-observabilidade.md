# FE-007 — Usuários e observabilidade

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-002, BE-004

## Objetivo

Entregar gestão de atendentes ao ADMIN e dashboard técnico sanitizado para
SUPPORT, mantendo separação verificável de conteúdo.

## Escopo

- ADMIN cria, edita, bloqueia e desbloqueia AGENT/SUPPORT.
- Confirmação, motivo e feedback de encerramento de sessões/jobs.
- SUPPORT vê health, filas, WhatsApp, OpenAI, ClamAV, versão, migrations e disco.
- Alertas sanitizados em tempo real para ADMIN/SUPPORT.
- Auditoria paginada e filtrável, sem payload sensível.

## Requisitos

- **FE007-R01:** SUPPORT não possui rota/componente/request de conteúdo.
- **FE007-R02:** telefone/nome/ID sensível não aparece em DOM, log ou tooltip.
- **FE007-R03:** bloqueio mostra impacto antes de confirmar.
- **FE007-R04:** métricas diferenciam indisponível de zero.
- **FE007-R05:** erro técnico exibido usa código/correlação, nunca stack/payload.

## Cenários de aceite

```gherkin
Given SUPPORT autenticado
When navega por toda a aplicação
Then nenhum request de conversa, mensagem, mídia, prompt ou QR é emitido

Given ADMIN confirma bloqueio com motivo
When backend encerra a sessão
Then lista atualiza por evento/snapshot e mostra resultado auditável

Given métrica indisponível
When dashboard renderiza
Then mostra estado desconhecido/degradado, não valor zero enganoso
```

## TDD e evidências

Matriz de rotas/request spies, snapshot de DTO sanitizado, component tests de
estados e E2E separado para ADMIN e SUPPORT.

## Rollout e rollback

Rota nova somente após BE-004; não reutiliza dashboards do legado que exponham
payloads globais.
