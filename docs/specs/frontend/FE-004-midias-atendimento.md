# FE-004 — Mídias no atendimento

- **Estado:** DRAFT
- **Design pai:** [migração Angular](../frontend-migration-design.md)
- **Depende de:** FE-003, BE-010

## Objetivo

Permitir visualizar e enviar mídias seguras, exibindo estados reais de
quarentena/rejeição sem processar conteúdo perigoso no navegador.

## Escopo

- Bolhas de imagem, áudio, documento e formato rejeitado/desconhecido.
- Upload multipart por streaming, progresso, cancelamento e legenda.
- Gravação de áudio com permissão, revisão, cancelamento e envio.
- Download autenticado e URLs temporárias revogadas.
- Estados `preparing`, `quarantined`, `clean`, `rejected`, `unsupported`, erro.

## Requisitos

- **FE004-R01:** frontend aplica limite preliminar, backend permanece autoritativo.
- **FE004-R02:** nenhum arquivo desconhecido é aberto inline.
- **FE004-R03:** URLs object são revogadas no teardown.
- **FE004-R04:** falha de uma mídia não remove histórico anterior.
- **FE004-R05:** UI nunca afirma CLEAN/SENT sem confirmação do backend.
- **FE004-R06:** nome/tamanho/MIME exibidos são sanitizados.

## Cenários de aceite

```gherkin
Given arquivo .bat renomeado para .pdf
When backend o rejeita
Then UI mostra alerta sanitizado sem link de abertura ou conteúdo

Given permissão de microfone negada
When AGENT tenta gravar
Then compositor continua utilizável e explica como recuperar a permissão

Given upload cancelado
When há request e preview ativos
Then ambos são abortados e a object URL é revogada
```

## TDD e evidências

Testes de estado e cleanup primeiro; componentes com arquivos fake; contrato de
status; Playwright de imagem, documento, áudio e rejeição.

## Rollout e rollback

Flag por tipo de mídia. Texto permanece funcional se media pipeline degradar.
