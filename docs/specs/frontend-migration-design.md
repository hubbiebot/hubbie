# Migração do front-end Hubbie com Strangler Fig

- Data: 12 de agosto de 2026
- Status: design aprovado
- Stack alvo: Angular 22, TypeScript e Tailwind CSS

## 1. Resumo executivo

O front-end atual concentra marcação, estilos, estado, integração Socket.IO e regras de interface em um único `index.html`. A migração criará um painel Angular separado em `apps/web/` e substituirá o legado por fatias verticais, sem exigir uma virada única.

A estratégia combina:

- Strangler Fig por rotas e feature flags;
- desenvolvimento orientado por especificações (SDD);
- Golden Master para caracterizar o comportamento existente;
- componentes standalone e predominantemente stateless;
- lazy loading por feature;
- Signals para estado síncrono e RxJS nas fronteiras assíncronas;
- adapters temporários apenas para caracterização do legado; as fatias Angular
  entram em produção sobre REST/Socket.IO versionados do novo backend;
- tema claro, Segoe UI Variable, Tailwind e ícones Lucide;
- testes unitários, de componentes, contrato, integração, acessibilidade, visuais e E2E.

O princípio de Pareto define a ordem: primeiro autenticação, estado operacional, conversas e mensagens; depois mídias e disparos; por último os fluxos administrativos menos frequentes.

## 2. Contexto atual

O repositório contém um servidor Node/Express com Socket.IO e duas páginas legadas:

- `login.html`, com autenticação por formulário e QR Code;
- `index.html`, com painel, conversas, mensagens, estoque, lembretes, configurações, blacklist e disparos.

O legado depende de variáveis globais, handlers inline, manipulação direta do DOM, CSS embutido e interpolação de HTML. O servidor mantém dados em memória e arquivos JSON e expõe os comportamentos do painel principalmente por eventos Socket.IO.

O backend é governado por `docs/specs/SPEC-000-arquitetura-migracao.md` e pelas tasks em `docs/specs/backend/`. O front-end não alterará implementações internas do servidor; mudanças de contrato devem aparecer nas specs das duas frentes e usar as mesmas fixtures OpenAPI/eventos.

## 3. Objetivos

1. Migrar todo o painel para Angular 22 sem interromper a operação atual.
2. Melhorar usabilidade, consistência, responsividade e acessibilidade.
3. Preservar o painel legado até o contrato versionado equivalente estar estável.
4. Separar apresentação, estado, regras de interface e transporte.
5. Suportar mensagens de texto, imagem, arquivo e áudio com estados verdadeiros.
6. Substituir o disparo baseado apenas em texto livre por seleção de conversas e entrada estruturada de números.
7. Criar um painel administrativo navegável, sem concentrar funcionalidades em modais.
8. Proteger a migração com especificações e testes de caracterização.
9. Permitir rollback por fatia enquanto o legado existir.

## 4. Não objetivos

- Reescrever o backend dentro do trabalho de front-end.
- Introduzir NgRx antes de existir necessidade comprovada.
- Implementar modo escuro no primeiro ciclo.
- Criar fila offline de mensagens sem persistência e idempotência fornecidas pelo backend.
- Reproduzir vulnerabilidades, mensagens enganosas ou problemas de acessibilidade do legado.
- Alterar regras comerciais de estoque, IA, lembretes ou disparos sem uma especificação própria.

## 5. Decisões consolidadas

| Tema | Decisão |
| --- | --- |
| Framework | Angular 22, versão atual em suporte ativo em 12/08/2026 |
| Linguagem | TypeScript em modo estrito |
| Componentes | Standalone, `OnPush` e stateless quando forem de apresentação |
| Estilos | Tailwind CSS integrado pelo Angular CLI |
| Tema | Claro por padrão |
| Tipografia | `Segoe UI Variable`, `Segoe UI`, `system-ui`, `sans-serif` |
| Ícones | `@lucide/angular`, importando somente os ícones utilizados |
| Estado | Signals e facades por feature |
| Assíncrono | RxJS no Socket.IO, uploads e demais operações externas |
| Formulários | Reactive Forms |
| Rotas | Lazy loading por feature |
| Transporte | Adapter legado durante Strangler; REST + Socket.IO versionado no destino |
| Testes unitários | Vitest e Angular TestBed |
| Testes E2E/visuais | Playwright |
| Estratégia | Strangler Fig, SDD, Golden Master e cortes Pareto |

Angular 19 foi descartado porque deixou de receber suporte em maio de 2026. A arquitetura não dependerá de APIs experimentais do Angular 22.

## 6. Alternativas consideradas

### 6.1 Strangler por rotas — escolhido

O Angular assume rotas completas progressivamente, enquanto o painel anterior permanece em `/legacy`. Essa opção oferece isolamento, rollback simples, lazy loading real e pouco acoplamento entre as duas interfaces.

### 6.2 Ilhas Angular dentro do HTML legado

Reduz o tempo até o primeiro componente visual, mas mistura ciclos de vida, CSS global, eventos e estado. Foi rejeitada porque prolongaria a arquitetura que está sendo substituída.

### 6.3 SPA paralela com troca única

Facilita o desenvolvimento isolado, porém adia feedback real, aumenta risco de regressão e contraria Strangler Fig. Foi rejeitada.

## 7. Topologia da migração

Durante a transição:

```text
Navegador
   |
   +-- /login -----------------> JWT em memória + refresh HttpOnly
   +-- /app/* -----------------> Angular 22
   +-- /legacy ----------------> painel HTML atual
                                  |
Angular --------------------------+-- REST/Socket.IO no mesmo domínio
                                         |
                                         +-- backend Node/Express
```

Regras:

- o workspace Angular ficará em `apps/web/`, no mesmo monorepo e com build próprio;
- o build será servido pelo Express sob `/app` durante a migração; a configuração da rota e do fallback SPA pertence ao agente do backend e será validada pelo contrato compartilhado;
- o access JWT de 20 minutos ficará somente em memória; o refresh token permanecerá em cookie HTTP-only;
- `/legacy` permanecerá protegido pela mesma autenticação;
- cada feature terá uma flag de ativação e um link de retorno ao legado;
- depois do último corte, o Angular assumirá `/` e `/legacy` será removido em uma entrega separada e reversível.

## 8. Rotas e lazy loading

O shell e os serviços essenciais serão o único código carregado inicialmente. Cada grupo abaixo será um chunk lazy-loaded:

| Rota | Feature |
| --- | --- |
| `/app/conversas` | caixa de entrada e atendimento |
| `/app/disparos` | seleção de destinatários e disparos múltiplos |
| `/app/dashboard` | acompanhamento operacional |
| `/app/estoque` | gestão de produtos e validade |
| `/app/lembretes` | agendamento e cancelamento |
| `/app/configuracoes/ia` | prompt e regras da IA |
| `/app/configuracoes/blacklist` | números bloqueados |

`/app` redirecionará para `/app/conversas`, pois atendimento é a atividade de maior frequência. Rotas protegidas usarão guard funcional. O projeto não importará páginas de feature pelo shell nem por barrels que eliminem a separação de chunks.

## 9. Organização do workspace

```text
apps/web/
  src/
    app/
      core/
        auth/
        config/
        errors/
        realtime/
      layout/
      shared/
        models/
        ui/
        utils/
      features/
        conversations/
          data-access/
          pages/
          ui/
        broadcasts/
          data-access/
          pages/
          ui/
        dashboard/
        inventory/
        reminders/
        ai-settings/
        blacklist/
      app.config.ts
      app.routes.ts
    styles/
      tokens.css
      tailwind.css
  tests/
    contract/
    e2e/
    fixtures/
    golden-master/
```

Cada arquivo terá uma responsabilidade principal. Código compartilhado só entrará em `shared/` depois de ter pelo menos dois consumidores reais. Uma feature não importará detalhes internos de outra; comunicação transversal ocorrerá por portas públicas ou serviços de `core`.

## 10. Modelo de componentes

### 10.1 Componentes de apresentação

- recebem dados por signal inputs ou inputs tipados;
- emitem intenções por outputs;
- usam `ChangeDetectionStrategy.OnPush`;
- não acessam Socket.IO, storage, router ou serviços de negócio;
- não mantêm estado de domínio;
- podem manter somente estado efêmero local, como foco ou abertura de popover;
- possuem testes baseados em comportamento observável.

### 10.2 Páginas e facades

As páginas conectam rota, facade e componentes de apresentação. Cada facade:

- possui Signals graváveis privados;
- expõe Signals somente leitura e valores `computed`;
- concentra comandos da feature;
- converte streams do transporte em estado da interface;
- não contém marcação nem acesso direto ao DOM.

NgRx não fará parte da migração inicial. Sua introdução exigirá um ADR demonstrando necessidade de orquestração transversal, auditoria temporal ou repetição relevante entre facades.

## 11. Design system

O design seguirá a direção “operação em primeiro lugar”.

### 11.1 Fundamentos

- fundo claro neutro, superfícies brancas e verde como cor de ação/estado positivo;
- tokens semânticos, como `surface`, `border`, `text-muted`, `success`, `warning` e `danger`;
- Segoe UI Variable quando disponível no sistema, sem redistribuir arquivos proprietários da fonte;
- fallback para Segoe UI e fonte nativa do sistema;
- ícones Lucide com tamanho, espessura e rótulos acessíveis padronizados;
- raios, sombras e espaçamento definidos por escala, sem valores arbitrários recorrentes;
- movimento discreto e desativável por `prefers-reduced-motion`.

### 11.2 Layout responsivo

- a partir de 1280 px: navegação, lista, chat e detalhes do contato;
- entre 768 e 1279 px: detalhes em drawer e navegação compacta;
- abaixo de 768 px: lista, chat e detalhes como telas sequenciais;
- tabelas administrativas mantêm cabeçalhos e ações acessíveis, usando rolagem ou cartões conforme o conteúdo.

### 11.3 Acessibilidade

O alvo é WCAG 2.2 nível AA. Todos os fluxos essenciais deverão funcionar por teclado, ter foco visível, nomes acessíveis, contraste suficiente e anúncios de mudança de estado quando necessário.

## 12. Feature de conversas

Principais unidades:

- `ConversationsPage`;
- lista e item de conversa;
- busca, filtros e abas;
- cabeçalho do atendimento;
- timeline virtualizável;
- bolhas especializadas de texto, imagem, áudio, arquivo e sistema;
- compositor;
- pré-visualização de anexo;
- gravador de áudio;
- painel de informações do contato;
- barra de seleção múltipla.

Comportamentos:

- filtrar ativas, não lidas e arquivadas;
- buscar por nome, número, texto disponível e tags;
- fixar, arquivar, reabrir e fechar;
- ativar ou pausar a IA por conversa;
- mostrar contador de não lidas e última mensagem;
- preservar o rascunho ao trocar de conversa ou perder conexão;
- usar Enter para enviar e Shift+Enter para quebra de linha;
- impedir envios repetidos enquanto o mesmo comando estiver pendente.

## 13. Mensagens e mídias

O modelo canônico de mensagem separará conteúdo, autoria, direção, mídia e entrega. A timeline nunca dependerá de HTML vindo do servidor.

Tipos suportados:

- texto;
- imagem com legenda e visualização ampliada;
- áudio com duração, reprodução e progresso;
- arquivo com nome, tipo e tamanho;
- evento do sistema, incluindo pedido de atendente.

Estados possíveis:

1. `preparing`: mídia sendo lida ou processada;
2. `sending`: comando em trânsito;
3. `accepted`: servidor confirmou recebimento;
4. `sent`: WhatsApp confirmou envio;
5. `delivered`: destinatário recebeu;
6. `read`: destinatário leu;
7. `failed`: operação falhou e pode oferecer nova tentativa.

O adapter pode pular estados não comprovados pelo contrato disponível. Emitir um evento local não autoriza mostrar `accepted`, `sent` ou `delivered`. O legado atual permite inferir `sent` apenas quando retorna a própria `nova-msg` depois de `client.sendMessage`; entrega e leitura dependerão de eventos específicos do backend.

O compositor aceitará texto, emoji, imagem, arquivo e áudio gravado. Antes do envio de mídia haverá pré-visualização, legenda quando aplicável, remoção e validação de tipo/tamanho. Negação da permissão de microfone será tratada no próprio compositor.

## 14. Disparos múltiplos

O fluxo terá duas fontes combináveis de destinatários:

1. seleção visual de conversas existentes;
2. números digitados, separados por vírgula ou quebra de linha.

Todos os números serão normalizados, validados e exibidos como chips. Duplicatas entre números e conversas selecionadas serão removidas usando o identificador WhatsApp normalizado.

Antes de iniciar, uma etapa de confirmação exibirá:

- número total de destinatários válidos;
- entradas inválidas ou duplicadas;
- mensagem e anexo;
- aviso de operação irreversível;
- estado atual da conexão.

Durante o disparo, o painel mostrará progresso individual, sucessos e falhas quando o backend fornecer eventos por destinatário. Com o contrato legado, a interface mostrará somente “iniciado”, sem inventar progresso. A versão final da feature exigirá progresso confirmado e relatório de falhas.

O controle de intervalo, limites e políticas de envio continuará no backend; o front-end não oferecerá forma de contorná-los.

## 15. Features administrativas

### Dashboard

Prioriza status do WhatsApp, estado global da IA, conversas que precisam de atendente, não lidas e atividade recente. Métricas deriváveis do estado do front podem ser entregues primeiro; métricas históricas dependerão de contrato persistente do backend.

### Estoque

Mantém cadastro, edição, exclusão, busca, quantidade mínima e validade. Produtos vencidos ou próximos do vencimento usam alertas textuais e visuais, sem depender apenas de cor.

### Lembretes

Permite cadastrar, listar e cancelar lembretes. Formulários usam validação reativa, data local explícita e confirmação não bloqueante.

### Configuração da IA

O prompt deixa de ser um modal gigante e passa a ser página própria, com estado de alteração não salva e confirmação ao abandonar a rota.

### Blacklist

Normaliza números, previne duplicidade e pede confirmação antes de remover. A nomenclatura apresentada será “Números bloqueados”.

## 16. Fluxo de dados

Entrada em tempo real:

```text
Socket.IO
  -> LegacySocketAdapter
  -> normalizadores e modelos canônicos
  -> facade da feature
  -> Signals somente leitura
  -> página
  -> componentes stateless
```

Saída:

```text
interação do usuário
  -> output do componente
  -> página/facade
  -> porta de aplicação
  -> LegacySocketAdapter
  -> Socket.IO
```

O domínio da interface não conhecerá nomes de eventos legados. A troca futura de transporte altera o adapter, não as páginas ou componentes.

## 17. Contrato Socket.IO de compatibilidade

O primeiro adapter suportará os eventos atuais.

### Servidor para cliente

| Evento legado | Modelo canônico |
| --- | --- |
| `config-atual` | estado global da IA |
| `whatsapp-status`, `ready`, `qr` | estado da conexão |
| `nova-msg` | mensagem/conversa atualizada |
| `contato-info` | identidade do contato |
| `atualizar-pausados` | IA pausada por conversa |
| `atualizar-fixados` | conversas fixadas |
| `atualizar-arquivadas` | conversas arquivadas |
| `atualizar-tags-geral`, `atualizar-cores-tags` | tags do contato |
| `atualizar-lista-negra` | números bloqueados |
| `atualizar-lembretes` | lembretes |
| `atualizar-estoque-tabela` | produtos |
| `carregar-config-prompt` | configuração da IA |
| `conversa-fechada` | seleção encerrada |

### Cliente para servidor

| Evento legado | Comando canônico |
| --- | --- |
| `toggle-global` | alterar IA global |
| `toggle-contato-ia` | alterar IA da conversa |
| `fixar-chat`, `desfixar-chat` | alterar fixação |
| `arquivar-conversa`, `reabrir-conversa`, `fechar-conversa` | alterar ciclo da conversa |
| `iniciar-conversa-manual`, `adicionar-contato` | abrir/criar conversa |
| `enviar-mensagem-manual` | enviar texto ou mídia |
| `enviar-disparo` | iniciar disparo legado |
| eventos de tags | manter tags |
| eventos de estoque | manter produtos |
| eventos de lembrete | manter lembretes |
| eventos de blacklist | manter números bloqueados |
| `salvar-config-prompt` | salvar configuração da IA |

As extensões do backend deverão acrescentar correlação por `clientMessageId`, acknowledgements e eventos de status. O modelo canônico do front já contempla esses dados, mas continuará compatível quando eles estiverem ausentes.

## 18. Tratamento de erros

- desconexão Socket.IO gera banner persistente e preserva rascunhos;
- envio fica indisponível sem conexão confirmada;
- falha de uma mídia não derruba a conversa nem remove mensagens anteriores;
- falhas acionáveis aparecem junto ao item afetado;
- toasts ficam restritos a confirmações não bloqueantes;
- erros globais passam por `ErrorHandler` e logging sanitizado;
- expiração de sessão leva ao login sem loop de redirecionamento;
- falha no carregamento de chunk oferece recarregamento controlado;
- falha parcial de disparo mantém o relatório dos destinatários já processados;
- nenhuma mensagem ao usuário expõe stack trace, token, conteúdo de mídia ou dado sensível.

## 19. Segurança

- mensagens são renderizadas por binding de texto; não se usa `innerHTML` com conteúdo externo;
- URLs de mídia são criadas e revogadas de forma controlada;
- tipos e tamanhos de arquivo são verificados antes da conversão ou upload;
- dependências de CDN do legado são substituídas por pacotes versionados no build;
- access JWT permanece em memória e refresh em cookie HTTP-only; nenhum token é copiado para local/session storage;
- logs não armazenam corpo integral de conversas ou mídia;
- qualquer HTML rico futuro exigirá sanitização e especificação próprias.

## 20. Processo SDD

Cada fatia vertical terá uma especificação `FE-*` antes da implementação em `docs/specs/frontend/`. A especificação contém:

1. objetivo e limite da fatia;
2. comportamento legado observado;
3. comportamento desejado e mudanças intencionais;
4. invariantes;
5. cenários Given/When/Then;
6. contratos de entrada e saída;
7. estados de loading, vazio, sucesso e erro;
8. requisitos de acessibilidade e responsividade;
9. matriz que liga critérios de aceite aos testes.

O ciclo por fatia será:

```text
especificar -> caracterizar legado -> escrever testes -> implementar
-> validar equivalência/mudanças -> liberar por flag -> observar -> cortar legado
```

Nenhuma diferença em relação ao Golden Master será aceita sem estar descrita como mudança intencional na especificação.

## 21. Golden Master

O Golden Master usa fixtures determinísticas e um Socket.IO falso. Ele não depende de conta real, QR Code real, relógio real ou rede externa.

Serão versionados:

- screenshots do legado nos estados relevantes;
- snapshots textuais de dados normalizados;
- sequência de eventos e payloads;
- árvore de acessibilidade dos fluxos essenciais;
- resultado de ações críticas.

Datas, identificadores aleatórios, QR Code e outras regiões dinâmicas serão congelados ou mascarados. Screenshots serão gerados em ambiente Playwright fixo; atualização de baseline exige comando explícito, revisão humana e justificativa na especificação. O CI nunca atualizará snapshots automaticamente.

O Golden Master caracteriza o que existe, mas não prevalece sobre segurança, acessibilidade ou uma mudança aprovada.

## 22. Estratégia de testes

### Unitários

Cobrem normalizadores, parsers, deduplicação de destinatários, Signals, valores computados e máquinas de estado. Parsers de números, transições de entrega e deduplicação terão cobertura de branches de 100%.

### Componentes

Vitest e TestBed verificam renderização por inputs, outputs, teclado, foco, formulários, estados vazios, erros e nomes acessíveis. Os testes observam resultados, não detalhes privados.

### Integração

Um fake de Socket.IO valida subscriptions, teardown, reconexão, normalização e comandos. Testes de contrato usam fixtures JSON para detectar mudança de payload.

### E2E e visual

Playwright cobre:

- login e expiração de sessão;
- conexão e desconexão;
- selecionar conversa e enviar texto;
- anexar imagem/arquivo;
- gravar, cancelar, revisar e enviar áudio;
- selecionar destinatários e confirmar disparo;
- arquivar/reabrir, tags e IA por conversa;
- fluxos administrativos essenciais;
- layouts desktop, tablet e mobile;
- regressão visual e árvore de acessibilidade.

### Gates de CI

Uma fatia só pode ser liberada quando lint, testes unitários, integração, build de produção e E2E da fatia passam. O manifesto de build deverá comprovar que features administrativas não entraram no bundle inicial.

## 23. Ordem de entrega pelo princípio de Pareto

Este documento governa o programa completo, mas não autoriza um plano monolítico. O primeiro plano de implementação cobrirá somente os cortes 0 e 1. Cada corte posterior repetirá o ciclo especificação, revisão, plano e execução, usando o aprendizado da entrega anterior.

### Corte 0 — Caracterização e fundação

- harness determinístico do legado;
- Golden Masters iniciais;
- workspace Angular, Tailwind, tokens, lint e testes;
- shell, roteamento, feature flags e adapter Socket.IO.

### Corte 1 — Operação essencial

- login compatível;
- shell;
- status do WhatsApp e IA global;
- conversas ativas/arquivadas;
- busca, seleção e envio de texto.

### Corte 2 — Mídias

- imagem, arquivo e áudio;
- pré-visualização;
- estados e nova tentativa;
- testes de permissões e falhas.

### Corte 3 — Disparos

- seleção múltipla de conversas;
- números separados por vírgula/quebra de linha;
- chips, validação e deduplicação;
- confirmação, progresso e relatório.

### Corte 4 — Acompanhamento e administração

- dashboard;
- estoque;
- lembretes;
- configuração da IA;
- números bloqueados.

### Corte 5 — Cutover

- Angular assume `/`;
- observação pós-corte;
- remoção separada do front legado e seus assets;
- retirada do adapter legado somente quando o backend novo cobrir todas as portas.

## 24. Critério de pronto por fatia

Uma fatia está pronta quando:

- sua especificação foi revisada;
- o comportamento legado relevante possui Golden Master;
- diferenças intencionais estão documentadas;
- componentes respeitam os limites de estado e transporte;
- rotas e chunks permanecem lazy-loaded;
- estados de loading, vazio, erro e sucesso existem;
- testes da matriz de aceite passam;
- acessibilidade por teclado e WCAG 2.2 AA foi verificada;
- não há status de entrega inventado;
- a feature flag permite rollback ao legado;
- a integração foi validada com o contrato fornecido pelo backend.

## 25. Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Backend e front evoluírem contratos diferentes | portas canônicas, fixtures versionadas e testes de contrato |
| Golden Master perpetuar defeitos | especificação aprovada prevalece sobre baseline |
| CSS inconsistente | tokens semânticos e componentes compartilhados controlados |
| Bundle inicial crescer | lazy loading e inspeção do manifesto no CI |
| Estado duplicado entre features | ownership por facade e interfaces públicas |
| Status de mensagem enganoso | renderizar apenas confirmação comprovada |
| Disparo acidental ou duplicado | deduplicação, confirmação e bloqueio durante submissão |
| Regressão visual dependente do ambiente | browser, SO, fonte, dados e relógio fixos |
| Conflito com trabalho do backend | workspace `apps/web/` e mudanças de contrato coordenadas |

## 26. Referências técnicas

- [Angular — política de versões](https://angular.dev/reference/releases)
- [Angular — componentes standalone](https://angular.dev/guide/components)
- [Angular — Signals](https://angular.dev/guide/signals)
- [Angular — roteamento](https://angular.dev/guide/routing)
- [Angular — integração com Tailwind CSS](https://angular.dev/guide/tailwind)
- [Angular — lazy loading](https://angular.dev/guide/routing/define-routes#lazily-loaded-components)
- [Angular — testes E2E](https://angular.dev/tools/cli/end-to-end)
- [Playwright — comparações visuais](https://playwright.dev/docs/test-snapshots)
- [Lucide — biblioteca de ícones](https://lucide.dev/)
