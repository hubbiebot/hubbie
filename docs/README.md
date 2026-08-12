# Documentação do Hubbie

Esta pasta é a fonte de verdade para mudanças de produto e arquitetura.

## Processo SDD

Toda implementação começa por uma especificação revisada. O fluxo obrigatório é:

1. registrar contexto, objetivo e limites;
2. caracterizar o comportamento legado com Golden Master;
3. definir comportamento desejado e mudanças intencionais;
4. escrever cenários de aceite e contratos;
5. ligar cada critério a um teste;
6. implementar a menor fatia que satisfaça a especificação;
7. validar, liberar por flag e manter rollback;
8. atualizar a especificação quando uma decisão aprovada mudar.

Código não é a fonte primária de requisitos. Uma diferença entre código e especificação deve ser resolvida antes da liberação.

## Organização

- `specs/`: especificações arquiteturais e executáveis de front-end e backend.

Decisões posteriores que alterem um design aprovado serão registradas no mesmo diretório com o nome `adr-NNN-descricao.md`.

As especificações principais ficam lado a lado e nunca são misturadas:

- `specs/frontend-migration-design.md`: responsabilidade do agente de front-end;
- `specs/backend-migration-design.md`: responsabilidade do agente de backend.

O arquivo de backend será criado e mantido pelo agente responsável por essa frente. Mudanças que afetem ambos os lados devem aparecer nos dois arquivos e compartilhar fixtures de contrato.

## Design vigente do front-end

- [Migração Angular com Strangler Fig](specs/frontend-migration-design.md)

## Estados de uma especificação

- `draft`: em elaboração, não autoriza implementação;
- `approved`: comportamento aprovado, testes podem ser escritos;
- `implemented`: critérios atendidos e verificados;
- `superseded`: substituída por outra especificação ou ADR identificado.

Cada documento informa seu estado, design pai e responsável pelo escopo.
