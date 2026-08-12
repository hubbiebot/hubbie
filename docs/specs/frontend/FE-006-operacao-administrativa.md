# FE-006 — Estoque, lembretes e configurações

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-002, BE-005, BE-008

## Objetivo

Migrar as operações administrativas de estoque, tags, lembretes, IA global e
prompt para páginas acessíveis, com conflitos e falhas explícitos.

## Escopo

- Estoque: lista, busca, cadastro, edição, baixa/entrada, validade e alertas.
- Tags/cores e preferências de conversa.
- Lembretes: agendar em timezone explícito, listar e cancelar.
- Configuração da IA: estado global, prompt versionado e dirty-state guard.
- Números/contatos bloqueados como parte da administração autorizada.

## Requisitos

- **FE006-R01:** edição envia versão e trata `409` sem sobrescrever silenciosamente.
- **FE006-R02:** estoque vencido/mínimo não depende somente de cor.
- **FE006-R03:** data local é convertida/exibida com timezone explícito.
- **FE006-R04:** prompt não é registrado ou renderizado como HTML.
- **FE006-R05:** formulário preserva entrada após erro recuperável.

## Cenários de aceite

```gherkin
Given produto alterado por outro usuário
When o formulário envia versão antiga
Then apresenta conflito, dados atuais e opção consciente de reaplicar

Given prompt modificado e não salvo
When ADMIN abandona a rota
Then recebe confirmação não bloqueante e acessível

Given lembrete em America/Sao_Paulo
When salvo e relido
Then instante UTC representa o horário local escolhido
```

## TDD e evidências

Testes primeiro para preço/data/version, componentes/formulários, contrato de
erros e Playwright dos fluxos críticos.

## Rollout e rollback

Feature flag por rota administrativa, permitindo retorno granular ao legado.
