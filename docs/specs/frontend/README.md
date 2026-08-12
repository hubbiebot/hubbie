# Catálogo de specs do frontend

Design pai: [migração Angular](../frontend-migration-design.md) e
[SPEC-000](../SPEC-000-arquitetura-migracao.md).

| ID | Task | Estado | Depende de |
|---|---|---|---|
| FE-001 | [Golden Master e fundação Angular](FE-001-golden-master-fundacao.md) | DRAFT | SPEC-000 |
| FE-002 | [Login, sessão e shell](FE-002-login-sessao-shell.md) | DRAFT | FE-001, BE-003 |
| FE-003 | [Caixa compartilhada e texto](FE-003-caixa-conversas-texto.md) | DRAFT | FE-002, BE-006, BE-007 |
| FE-004 | [Mídias no atendimento](FE-004-midias-atendimento.md) | DRAFT | FE-003, BE-010 |
| FE-005 | [Campanhas e progresso](FE-005-campanhas-progresso.md) | DRAFT | FE-003, BE-009 |
| FE-006 | [Estoque, lembretes e configurações](FE-006-operacao-administrativa.md) | DRAFT | FE-002, BE-005, BE-008 |
| FE-007 | [Usuários e observabilidade](FE-007-usuarios-observabilidade.md) | DRAFT | FE-002, BE-004 |
| FE-008 | [Hardening, acessibilidade e performance](FE-008-hardening-acessibilidade.md) | DRAFT | FE-003..FE-007 |
| FE-009 | [Cutover do frontend](FE-009-cutover-frontend.md) | DRAFT | FE-008, BE-012 |

O frontend legado permanece disponível por rota/feature flag até FE-009.
