# Catálogo de specs do backend

Design pai: [SPEC-000](../SPEC-000-arquitetura-migracao.md).

| ID | Task | Estado | Depende de |
|---|---|---|---|
| BE-001 | [Fundação do monorepo Express](BE-001-fundacao-express.md) | DRAFT | SPEC-000 |
| BE-002 | [MySQL, criptografia e importação](BE-002-mysql-criptografia-importacao.md) | DRAFT | BE-001 |
| BE-003 | [Autenticação JWT e refresh](BE-003-autenticacao-jwt-refresh.md) | DRAFT | BE-001, BE-002 |
| BE-004 | [Usuários, permissões e auditoria](BE-004-usuarios-permissoes-auditoria.md) | DRAFT | BE-003 |
| BE-005 | [Dados legados e cache-aside](BE-005-dados-legados-cache.md) | DRAFT | BE-002, BE-004 |
| BE-006 | [Conversas e mensagens](BE-006-conversas-mensagens.md) | DRAFT | BE-002, BE-004 |
| BE-007 | [Socket.IO e Pub/Sub](BE-007-socketio-pubsub.md) | DRAFT | BE-003, BE-006 |
| BE-008 | [Outbox, BullMQ e lembretes](BE-008-outbox-bullmq-lembretes.md) | DRAFT | BE-002, BE-006 |
| BE-009 | [Campanhas e gate de disparo](BE-009-campanhas-disparos.md) | DRAFT | BE-007, BE-008 |
| BE-010 | [Mídia segura e IA](BE-010-midia-segura-ia.md) | DRAFT | BE-006, BE-008 |
| BE-011 | [Worker WhatsApp](BE-011-worker-whatsapp.md) | DRAFT | BE-007, BE-009, BE-010 |
| BE-012 | [Strangler cutover e VPS](BE-012-cutover-vps.md) | DRAFT | BE-005, BE-011 |

Cada arquivo representa uma unidade de planejamento e implementação. Uma task
só muda para `APPROVED` depois de contratos e critérios serem revisados.
