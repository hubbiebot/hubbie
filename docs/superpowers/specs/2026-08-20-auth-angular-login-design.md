# Autenticação e login Angular — design

**Estado:** aprovado para especificação; aguarda revisão do documento.  
**Escopo:** primeira fatia vertical de autenticação do Hubbie: persistência de
usuários e tokens, API de autenticação e frontend Angular de login. Não inclui
painel, conversas, estoque, campanhas ou migração de sessão legada.

## Objetivo

Substituir o login legado, que usa credenciais fixas e `express-session`, por
uma autenticação local segura. No corte, toda sessão legada é invalidada e cada
usuário deve fazer login novamente pela nova aplicação Angular.

## Arquitetura

### Backend

`apps/api` recebe um módulo `auth` com a separação:

```text
routes -> controllers -> services -> repositories
```

O módulo depende de contratos OpenAPI e de interfaces de persistência, não de
componentes Angular. A autorização será centralizada em políticas de papel e
permissão; guards de frontend não são controle de acesso.

As primeiras tabelas MySQL são `users` e `refresh_tokens`, criadas por
migrations explícitas. O primeiro `ADMIN` é criado de forma idempotente com
credencial temporária vinda de configuração externa. Senhas e refresh tokens
são armazenados somente como hash.

### Frontend

`apps/web` usa Angular 22, componentes standalone, TypeScript strict, Reactive
Forms e PrimeNG. A primeira rota pública é `/login`. Não haverá shell de
negócio nesta fatia.

A `SessionFacade` mantém o access token somente em memória. O refresh token é
um cookie e nunca é lido pelo JavaScript. Um interceptor anexa o Bearer token e
um mecanismo single-flight evita múltiplos refreshes concorrentes.

## Contratos HTTP

| Método e rota | Resultado |
|---|---|
| `POST /api/v1/auth/login` | Access token, sessão sanitizada e cookie de refresh. |
| `POST /api/v1/auth/refresh` | Rotaciona refresh e retorna novo access token. |
| `POST /api/v1/auth/logout` | Revoga o refresh e limpa o cookie. |
| `GET /api/v1/auth/session` | Retorna a sessão do access token válido. |
| `POST /api/v1/auth/change-initial-credentials` | Troca a credencial temporária do primeiro acesso. |

Login e refresh retornam `accessToken`, `expiresIn: 1200` e um DTO de sessão
sem segredo. Problemas usam RFC 9457, sem revelar se usuário, senha ou token
existem.

## Segurança e autorização

- Senhas: Argon2id com parâmetros calibrados para a VPS.
- Access token: JWT RS256, 20 minutos, com `sub`, `role`, `authVersion`, `jti`,
  `iss`, `aud`, `iat` e `exp` validados.
- Refresh: token opaco aleatório, cookie `HttpOnly`, `Secure` e
  `SameSite=Strict`; rotação a cada uso e revogação da família em caso de
  reutilização.
- Login: máximo de cinco tentativas em 15 minutos por IP e identidade, com
  resposta neutra e `Retry-After` ao exceder o limite.
- Primeiro acesso: enquanto `must_change_credentials` estiver ativo, somente
  troca de credenciais e logout são permitidos.
- Papéis iniciais: `ADMIN` e `AGENT`. Todo endpoint protegido declara a
  permissão exigida no backend.

## Experiência de login

O formulário PrimeNG usa Reactive Forms com validação de campos obrigatórios e
limites de tamanho. A senha permanece oculta, o botão fica indisponível durante
o envio e erros são anunciados de forma acessível sem confirmar a existência da
conta. Após login com credencial temporária, a navegação é forçada para a troca
inicial; depois da troca, a sessão segue para uma rota vazia protegida até que
o painel seja implementado.

## Corte e rollback

No corte, `connect.sid` não concede mais acesso. O usuário reloga pela nova
rota Angular. O rollback desativa as rotas novas antes de qualquer remoção de
dados; ele não reativa automaticamente sessões legadas.

## Verificação

TDD e DDD são obrigatórios para login, refresh, revogação, troca inicial e
autorização. Os testes cobrem algoritmo JWT, rotação e reutilização de refresh,
rate limit, enumeração de contas, `auth_version`, políticas de papel e os
fluxos Angular de login, troca inicial, expiração e logout. Endpoints simples
seguem testes proporcionais.
