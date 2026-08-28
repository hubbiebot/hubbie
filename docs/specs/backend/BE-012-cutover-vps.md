# BE-012 — Strangler cutover e VPS

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Depende de:** BE-005, BE-011

## Objetivo

Promover todas as fatias, operar os serviços nativamente na VPS Linux e retirar
o backend legado de forma observável e reversível.

## Escopo

- Nginx TLS 1.3, HTTPS/WSS, headers e limites.
- Releases imutáveis, symlink `current`, serviços systemd e usuários dedicados.
- MySQL/Redis loopback, ACLs, firewall e SSH por chave sem root.
- Backups cifrados/restauração de MySQL, mídia e `LocalAuth`.
- Runbooks de deploy, migration, rollback, rotação e incidentes.
- Promoção por feature flag, reconciliação final e arquivamento dos JSONs.
- Remoção de credenciais fixas e eventos inseguros do legado antes da exposição.

## Requisitos

- **BE012-R01:** legado atende até cada fatia cumprir seus gates.
- **BE012-R02:** somente Nginx expõe porta pública.
- **BE012-R03:** deploy falho retorna symlink e serviços à versão anterior.
- **BE012-R04:** restauração de backup é testada antes do corte final.
- **BE012-R05:** P0 de segurança do legado não permanece acessível.
- **BE012-R06:** reconexão WhatsApp é a única indisponibilidade aceita.

## Cenários de aceite

```gherkin
Given nova release falha em readiness
When o deploy valida saúde
Then Nginx mantém versão anterior e nenhum schema destrutivo é aplicado

Given Redis é perdido após cutover
When serviços reiniciam
Then cache, jobs publicáveis e tempo real são reconstruídos a partir do MySQL

Given rollback do worker WhatsApp
When o novo worker libera ownership
Then o legado usa o backup consistente do LocalAuth sem concorrência
```

## Testes obrigatórios

Ensaio em staging semelhante à VPS, smoke pós-deploy, restore drill, firewall,
TLS, systemd hardening, rollback de release e failover de dependências.

## Critério de pronto

Todos os AC da SPEC-000 verificados, métricas estáveis na janela acordada, JSONs
somente leitura/arquivados e backend legado removível por release separada.
