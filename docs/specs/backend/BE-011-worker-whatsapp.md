# BE-011 — Worker WhatsApp

- **Estado:** DRAFT
- **Design pai:** [SPEC-000](../SPEC-000-arquitetura-migracao.md)
- **Depende de:** BE-007, BE-009, BE-010

## Objetivo

Substituir o proprietário legado da única sessão `whatsapp-web.js`, persistindo
inbound/outbound e integrando filas, IA, mídia e autoria.

## Escopo

- Um worker/sessão/número por instalação, protegido por advisory lock e lease
  autoritativos no MySQL, com fencing token monotônico.
- Chromium com sandbox, usuário Linux e perfil `LocalAuth` exclusivos.
- Máquina de estados persistida, QR apenas para ADMIN e heartbeat.
- Inbound deduplicado, comandos administrativos por WhatsApp removidos.
- Outbound único, revalidação e estados `SENT/FAILED/UNKNOWN`.
- Prefixo `*Atendente:*` em humano e `*Assistente:*` em IA; painel recebe autoria
  separada. Anexo inclui autoria na legenda.
- Reconexão com full jitter e shutdown gracioso.

## Requisitos

- **BE011-R01:** nunca existem dois workers proprietários ativos.
- **BE011-R02:** nenhum remetente WhatsApp executa operação administrativa.
- **BE011-R03:** conteúdo original não recebe prefixo persistido duas vezes.
- **BE011-R04:** crash ambíguo produz `UNKNOWN`, não retry automático.
- **BE011-R05:** `AUTH_FAILED` exige ADMIN e não apaga `LocalAuth`.
- **BE011-R06:** API/histórico continuam quando WhatsApp está degradado.
- **BE011-R07:** Redis não concede ownership; perda da conexão/lease MySQL
  interrompe consumo antes de outro envio.
- **BE011-R08:** todo `sendMessage` exige transação que valide fencing/lease e
  grave `CALL_STARTED`; takeover reconcilia órfãos como `UNKNOWN`.

## Cenários de aceite

```gherkin
Given dois workers iniciam simultaneamente
When disputam ownership
Then somente o fencing token atual permite consumir outbound

Given mensagem /venda ou /logmensagem recebida de qualquer contato
When processada
Then é tratada como conteúdo comum e não altera/exfiltra dados administrativos

Given queda após sendMessage antes do commit
When o worker reconcilia
Then marca UNKNOWN e solicita ação, sem duplicar automaticamente
```

## Testes obrigatórios

Fake do provider, advisory lock/lease/fencing MySQL, perda de conexão em cada
fronteira do envio, duplicação inbound, prefixos/retry, máquina de estados,
disconnect storm, shutdown e contrato de eventos.

## Rollout e rollback

Cutover exige pausa do legado, backup de `LocalAuth`, transferência e breve
reconexão. Em falha de readiness, novo worker para antes de devolver ownership.
