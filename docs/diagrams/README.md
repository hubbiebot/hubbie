# Diagramas do Hubbie

Este diretório reúne diagramas visuais das decisões arquiteturais do projeto. Os diagramas estão em formato Mermaid e podem ser renderizados pelo GitHub, GitLab, VS Code e outras ferramentas.

## Índice

| Diagrama | Descrição | Local |
|---|---|---|
| Escopo do MVP | Mindmap do que entra e sai do MVP | `../adrs/0001-mvp-simplificado.md` |
| Arquitetura macro | Componentes do sistema e comunicação | `../adrs/0002-arquitetura-macro.md` |
| Fluxo de autenticação | Login, refresh e revogação | `../adrs/0004-autenticacao-sessao.md` |
| Modelo de dados | Entidades principais do banco | `../adrs/0005-persistencia-schema.md` |
| Fluxo de filas | API → BullMQ → Worker | `../adrs/0006-mensageria-filas.md` |
| Pipeline de mídia | Recebimento, validação e storage | `../adrs/0007-processamento-midia.md` |
| Infraestrutura | VPS, serviços e deploy | `../adrs/0008-deploy-infraestrutura.md` |
| Cutover Strangler | Migração do legado para nova arquitetura | `../adrs/0009-migracao-cutover.md` |

## Como visualizar

1. Abra o arquivo `.md` correspondente no VS Code com a extensão **Markdown Preview Mermaid Support**.
2. Ou copie o bloco Mermaid para o [Mermaid Live Editor](https://mermaid.live).
3. No GitHub/GitLab, os diagramas são renderizados automaticamente na visualização do arquivo.

## Adicionar novos diagramas

Ao criar um novo ADR que mereça ilustração, inclua o diagrama diretamente no arquivo do ADR e registre-o neste índice.
