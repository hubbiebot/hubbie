# FE-008 — Hardening, acessibilidade e performance

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-003, FE-004, FE-005, FE-006, FE-007

## Objetivo

Executar os gates transversais que impedem o cutover de uma SPA insegura,
inacessível ou lenta.

## Escopo

- WCAG 2.2 AA, teclado, foco, leitores de tela e reduced motion.
- CSP sem inline/eval, assets locais, Trusted Types quando compatível.
- XSS, CSWSH, URL lifecycle, redaction e dependency audit.
- Orçamento de bundle, lazy chunks, virtualização e métricas de UX.
- Matriz desktop/tablet/mobile e erros/degradado/offline.
- Testes E2E dos fluxos integrados e relatório de paridade intencional.

## Requisitos

- **FE008-R01:** nenhum `innerHTML`/bypass com dado externo.
- **FE008-R02:** todos os fluxos essenciais funcionam por teclado.
- **FE008-R03:** contraste e nomes atendem WCAG 2.2 AA.
- **FE008-R04:** bundle inicial respeita orçamento definido no plano.
- **FE008-R05:** logs do navegador não contêm token, mensagem ou PII.
- **FE008-R06:** CSP bloqueia script inline e origem não permitida.

## Cenários de aceite

```gherkin
Given payload de mensagem com HTML/script
When a timeline renderiza
Then conteúdo aparece como texto sem execução ou navegação inesperada

Given somente teclado e viewport móvel
When AGENT atende, envia e bloqueia contato
Then foco e anúncios permitem concluir o fluxo

Given build de produção
When budgets e manifesto são inspecionados
Then nenhum chunk proibido ou asset CDN é encontrado
```

## TDD e evidências

Testes de segurança e axe primeiro para cada regressão encontrada; Playwright
cross-viewport, visual, performance budget, CSP report-only antes de enforce.

## Rollout e rollback

Nenhuma feature é promovida sem seus gates. CSP começa report-only e só muda a
enforce após relatório limpo.
