# Diagrama: Fluxo de Mensagens

Este diagrama ilustra o fluxo completo de uma mensagem no Hubbie, desde o recebimento pelo WhatsApp até a resposta ao cliente.

## Inbound (mensagem do cliente)

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant W as Worker
    participant DB as MySQL
    participant Q as BullMQ
    participant AI as OpenAI
    participant RT as Socket.IO

    WA->>W: message event
    W->>W: deduplicar por provider_message_id
    W->>DB: salvar mensagem inbound
    W->>RT: notificar frontend

    alt IA ativa e contato não bloqueado
        W->>Q: enqueue automation job
        Q->>W: processa automation
        W->>DB: buscar histórico + prompt
        W->>AI: envia contexto
        AI-->>W: resposta
        W->>Q: enqueue outbound job
        Q->>W: envia resposta WhatsApp
        W->>DB: atualiza mensagem outbound
        W->>RT: notifica frontend
    end
```

## Outbound (mensagem do atendente ou bot)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as API
    participant DB as MySQL
    participant Q as BullMQ
    participant W as Worker
    participant WA as WhatsApp

    F->>API: POST /api/v1/messages
    API->>DB: grava mensagem
    API->>Q: enqueue outbound
    API-->>F: 202 Accepted
    Q->>W: processa outbound
    W->>DB: revalida contato/estado
    W->>WA: sendMessage
    WA-->>W: provider_message_id
    W->>DB: atualiza status SENT
```

## Campanha (disparo em massa)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant API as API
    participant DB as MySQL
    participant Q as BullMQ
    participant W as Worker
    participant WA as WhatsApp

    F->>API: POST /api/v1/campaigns
    API->>DB: cria campanha + recipients
    API->>Q: enqueue bulk-dispatch
    API-->>F: campaign created

    loop para cada recipient
        Q->>W: processa recipient
        W->>DB: reserva slot (12-18s)
        W->>WA: sendMessage
        W->>DB: atualiza status
        W->>Q: enqueue próximo (delayed)
    end
```

## Estados de uma mensagem

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> SENT: enviada com sucesso
    PENDING --> FAILED: falha após retries
    PENDING --> CANCELED: contato bloqueado/IA pausada
    SENT --> DELIVERED: confirmação WhatsApp
    DELIVERED --> READ: visualizada
    FAILED --> [*]
    CANCELED --> [*]
```
