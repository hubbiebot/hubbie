# Especificação: cortes 0 e 1 do front-end

- Data: 2026-08-12
- Status: superseded
- Design pai: `docs/specs/frontend-migration-design.md`
- Escopo: fundação Angular e operação essencial de conversas
- Substituída por: `FE-001`, `FE-002` e `FE-003`

> Esta especificação preserva a caracterização detalhada do contrato Socket.IO
> legado. A implementação futura segue as tasks `FE-*`, pois decisões posteriores
> aprovaram `apps/web`, JWT/refresh e os contratos versionados do backend Express.

## 1. Objetivo

Entregar uma aplicação Angular 22 executável e testável que preserve o painel legado, conecte-se ao Socket.IO existente por uma porta isolada e permita acompanhar o estado operacional, listar conversas ativas/arquivadas, selecionar uma conversa e enviar texto sem apresentar confirmações falsas.

## 2. Escopo

### Corte 0 — caracterização e fundação

- harness determinístico para o `index.html` legado;
- Golden Master visual, textual e de eventos para o fluxo de conversa;
- workspace `apps/web/` com Angular 22, TypeScript estrito, Tailwind, Vitest, Playwright e lint;
- tema claro, Segoe UI Variable, tokens semânticos e ícones Lucide;
- shell standalone e rota de conversas lazy-loaded;
- configuração de runtime e feature flag para retorno ao legado;
- porta de tempo real, adapter Socket.IO e modelos canônicos.

### Corte 1 — operação essencial

- estado da conexão Socket.IO;
- status do WhatsApp e estado global da IA;
- conversas ativas e arquivadas;
- busca por nome, número e última mensagem;
- fixar, arquivar, reabrir, fechar e pausar/reativar IA por conversa;
- seleção de conversa e painel de detalhes;
- timeline de texto e avisos de atendimento;
- rascunho preservado por conversa;
- envio de texto com Enter e quebra de linha com Shift+Enter;
- confirmação visual de envio somente após o eco `nova-msg` do servidor;
- timeout e nova tentativa quando não houver confirmação;
- layout responsivo e acessível.

## 3. Fora do escopo

- imagem, áudio, arquivo e emoji;
- disparos múltiplos;
- dashboard analítico, estoque, lembretes, prompt da IA e números bloqueados;
- alteração do backend ou do contrato de autenticação;
- estado `delivered` ou `read` sem evento explícito do backend;
- modo escuro;
- remoção do `index.html` legado;
- ativação do Angular como rota de produção sem aprovação da feature flag e do contrato do backend.

## 4. Comportamento legado caracterizado

O Golden Master deve comprovar que o legado:

1. recebe `config-atual` e mostra se a IA global está ligada;
2. recebe `whatsapp-status` e mostra o detalhe operacional;
3. acumula conversas quando chegam eventos `nova-msg`;
4. separa IDs presentes em `atualizar-arquivadas`;
5. ordena fixadas antes das demais e não fixadas pela mensagem mais recente;
6. seleciona uma conversa, pede `iniciar-conversa-manual` e renderiza suas mensagens;
7. emite `enviar-mensagem-manual` com `{ id, mensagem }` ao enviar texto;
8. considera uma mensagem humana enviada somente quando recebe `nova-msg` com `isHuman: true`;
9. mostra um aviso especial quando `precisaAtendente` é verdadeiro;
10. usa manipulação de DOM e `innerHTML`, comportamento que não será reproduzido no Angular.

## 5. Mudanças intencionais

- conteúdo de mensagem será interpolado como texto, nunca inserido por `innerHTML`;
- ações deixam prompts e confirms nativos e usam controles acessíveis;
- conexão perdida produz banner persistente e desabilita envio;
- rascunhos sobrevivem à troca de conversa e à desconexão;
- o front não mostra mensagem otimista como enviada;
- a ausência de eco do servidor após 15 segundos vira erro confirmável e permite nova tentativa;
- a apresentação passa a ser responsiva, clara e navegável por teclado;
- o link “Abrir painel legado” permanece disponível enquanto a flag estiver ativa.

## 6. Invariantes

1. Nenhum componente de apresentação importa Socket.IO ou uma facade.
2. Nenhuma mensagem externa usa `innerHTML`.
3. O botão de enviar permanece desabilitado quando não há conversa, texto válido, conexão ou quando outro envio está pendente.
4. `sent` só é aplicado após `nova-msg` humano correspondente.
5. `delivered` e `read` não aparecem nestes cortes.
6. IDs arquivados continuam arquivados quando sua primeira mensagem chega depois do snapshot de arquivamento.
7. Eventos Socket.IO legados ficam restritos ao adapter.
8. A rota de conversas permanece num chunk lazy-loaded.
9. Nenhum arquivo do backend é modificado por esta implementação.
10. O legado permanece acessível por URL configurável.

## 7. Contratos

### 7.1 Runtime

```ts
export interface HubbieRuntimeConfig {
  socketUrl?: string;
  legacyUrl: string;
  featureFlags: {
    conversations: boolean;
  };
}
```

Na ausência de `window.__HUBBIE_CONFIG__`, os defaults são `socketUrl: undefined`, `legacyUrl: '/legacy'` e `conversations: true`.

### 7.2 Eventos recebidos

| Evento | Payload mínimo | Resultado canônico |
| --- | --- | --- |
| `connect` | — | conexão `connected` |
| `disconnect` | motivo | conexão `disconnected` |
| `connect_error` | erro | conexão `error` |
| `config-atual` | `{ ligado: boolean }` | IA global |
| `whatsapp-status` | `{ estado, detalhe }` | status WhatsApp |
| `ready` | — | WhatsApp `ready` |
| `atualizar-pausados` | `string[]` | IDs com IA pausada |
| `atualizar-fixados` | `string[]` | IDs fixados |
| `atualizar-arquivadas` | `string[]` | IDs arquivados |
| `contato-info` | `{ id, name }` | nome atualizado |
| `conversa-fechada` | `string` | seleção fechada |
| `nova-msg` | mensagem legada | mensagem canônica |

### 7.3 Comandos enviados

| Intenção | Evento legado | Payload |
| --- | --- | --- |
| definir IA global | `toggle-global` | `boolean` |
| definir IA da conversa | `toggle-contato-ia` | ID, somente quando estado desejado difere do snapshot |
| definir fixação | `fixar-chat`/`desfixar-chat` | ID |
| definir arquivamento | `arquivar-conversa`/`reabrir-conversa` | ID |
| fechar conversa | `fechar-conversa` | ID |
| selecionar conversa | `iniciar-conversa-manual` | ID |
| enviar texto | `enviar-mensagem-manual` | `{ id, mensagem }` |

## 8. Estados da interface

| Área | Loading | Vazio | Erro | Sucesso |
| --- | --- | --- | --- | --- |
| Shell | conexão em andamento | — | banner desconectado/erro | WhatsApp e IA visíveis |
| Lista | skeleton inicial | “Nenhuma conversa” | mantém último snapshot | itens ordenados |
| Chat | selecionando | “Selecione uma conversa” | mensagem local e retry | timeline renderizada |
| Envio | botão ocupado | texto vazio | confirmação não recebida | eco humano na timeline |

## 9. Cenários de aceite

### AC-FE-001 — lazy loading

Given o build de produção, when o manifesto for inspecionado, then a feature de conversas possui entry point/chunk separado do shell.

### AC-FE-002 — conexão

Given a aplicação aberta, when o socket conecta, then o banner de desconexão desaparece e o compositor pode ser habilitado se os demais requisitos estiverem presentes.

### AC-FE-003 — desconexão

Given uma conversa com rascunho, when o socket desconecta, then o banner aparece, o rascunho permanece e enviar fica desabilitado.

### AC-FE-004 — IA global

Given `config-atual` com `ligado: true`, when o evento é normalizado, then o shell mostra “IA global ligada”.

### AC-FE-005 — conversa ativa

Given uma `nova-msg` para ID não arquivado, when a facade processa o evento, then a conversa aparece na aba Ativas com nome, prévia e horário.

### AC-FE-006 — conversa arquivada

Given um ID no snapshot de arquivadas, when sua primeira `nova-msg` chega, then a conversa aparece somente em Arquivadas.

### AC-FE-007 — ordenação

Given conversas fixadas e não fixadas, when a lista é calculada, then fixadas aparecem primeiro e as demais em ordem decrescente de atualização.

### AC-FE-008 — busca

Given várias conversas, when o usuário busca por nome, número ou trecho da última mensagem sem considerar maiúsculas/acentos, then somente correspondências permanecem.

### AC-FE-009 — seleção

Given uma conversa listada, when o usuário a seleciona, then a timeline e os detalhes são exibidos e `iniciar-conversa-manual` é emitido uma vez.

### AC-FE-010 — rascunhos

Given texto digitado na conversa A, when o usuário visita B e volta para A, then o texto de A é restaurado.

### AC-FE-011 — Enter

Given texto válido e conexão ativa, when o usuário pressiona Enter sem Shift, then o formulário emite uma intenção de envio e não insere nova linha.

### AC-FE-012 — Shift+Enter

Given o compositor focado, when o usuário pressiona Shift+Enter, then uma quebra de linha é preservada e nada é enviado.

### AC-FE-013 — envio confirmado

Given um comando pendente, when chega `nova-msg` humano com a mesma conversa e corpo, then a mensagem entra na timeline como `sent`, o rascunho é limpo e o compositor deixa de estar ocupado.

### AC-FE-014 — timeout

Given um comando pendente sem eco, when passam 15 segundos, then o front mostra “Não foi possível confirmar o envio”, mantém o rascunho e oferece nova tentativa.

### AC-FE-015 — duplicidade

Given um comando pendente, when o usuário tenta enviar novamente, then nenhum segundo evento é emitido.

### AC-FE-016 — XSS

Given uma mensagem com `<img src=x onerror=...>`, when a timeline renderiza, then o texto literal é visível e nenhum elemento `img` é criado.

### AC-FE-017 — aviso de atendente

Given `precisaAtendente: true`, when a mensagem é renderizada, then existe aviso com ícone textual e nome acessível, além do conteúdo seguro.

### AC-FE-018 — teclado e foco

Given somente o teclado, when o usuário navega por busca, abas, lista, ações e compositor, then a ordem é lógica e o foco permanece visível.

### AC-FE-019 — responsividade

Given viewports de 1440×900, 1024×768 e 390×844, when o fluxo é executado, then não há overflow horizontal da página e lista/chat continuam utilizáveis.

### AC-FE-020 — rollback

Given a flag de conversas desabilitada, when `/app/conversas` é acessada, then o usuário recebe uma ação clara para abrir `legacyUrl`, sem inicializar o socket da feature.

## 10. Acessibilidade e responsividade

- alvo WCAG 2.2 AA;
- `aria-live` para conexão e falha de envio;
- abas com semântica e estado selecionado;
- itens de conversa são botões ou links reais;
- ícones sem texto possuem nome acessível;
- foco não é removido por reset CSS;
- contraste mínimo é verificado por axe;
- `prefers-reduced-motion` reduz transições;
- layout desktop usa quatro áreas; tablet recolhe detalhes; mobile alterna lista e chat.

## 11. Matriz requisito-teste

| Requisito | Teste | Camada |
| --- | --- | --- |
| AC-FE-001 | `assert-lazy-bundles.mjs` | build |
| AC-FE-002–004 | `status.facade.spec.ts`, `app-shell.spec.ts` | unitário/componente |
| AC-FE-005–010 | `conversations.facade.spec.ts`, `conversation-list.spec.ts` | unitário/componente |
| AC-FE-011–015 | `message-composer.spec.ts`, `conversations.facade.spec.ts` | componente/unitário |
| AC-FE-016–017 | `message-timeline.spec.ts` | componente/segurança |
| AC-FE-018–019 | `conversations.e2e.spec.ts` | E2E/axe/visual |
| AC-FE-020 | `app.routes.spec.ts`, `feature-disabled.e2e.spec.ts` | unitário/E2E |
| comportamento legado | `legacy-dashboard.golden.spec.ts` | Golden Master |
| contrato Socket.IO | `legacy-socket.adapter.spec.ts` | integração/contrato |

## 12. Rollout e rollback

1. Desenvolvimento e E2E usam Socket.IO falso determinístico.
2. Smoke local usa `ng serve` com proxy para o servidor legado na porta 7000.
3. O backend serve/protege `/app` somente após alinhar sessão e fallback SPA.
4. A flag `conversations` começa desativada no ambiente de produção.
5. Promoção exige build, testes, contrato e smoke autenticado verdes.
6. Rollback desativa a flag e direciona para `legacyUrl`; nenhum dado precisa ser revertido pelo front.

## 13. Critério de pronto

- Golden Masters revisados e versionados;
- lint, unitários, componentes, contrato, build e E2E verdes;
- chunk lazy comprovado;
- nenhum arquivo do backend alterado;
- todos os cenários AC-FE-001 a AC-FE-020 ligados a testes;
- tema claro, Segoe UI Variable e Lucide aplicados;
- acessibilidade sem violações críticas ou sérias no fluxo principal;
- feature flag e retorno ao legado testados;
- smoke com Socket.IO existente executado ou bloqueio de contrato explicitamente registrado.
