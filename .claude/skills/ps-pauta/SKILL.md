---
name: ps-pauta
description: Abre, retoma ou encerra uma pauta de trabalho (uma peça/demanda de design) e amarra a sessão atual a ela. Use no início de toda sessão sem pauta, quando o usuário pedir algo novo, ou ao concluir uma pauta.
---

# Pautas

Uma pauta = uma demanda de design = um handoff = **uma sessão**. O ID da sessão vem no contexto injetado pelo hook (`ID desta sessão: ...`).

## Abrir nova

1. Pergunte, em linguagem de designer, o nome da pauta e o cliente (se houver).
2. `node scripts/pauta.mjs nova --nome "<nome>" [--cliente "<cliente>"] --sessao <ID desta sessão>`
3. Preencha em `workspace/pautas/<slug>/handoff.md` o **Objetivo** e as **Decisões de design** que o usuário já passou (formato base em `templates/formatos.json`; identidade em `workspace/clientes/<cliente>/` quando existir).
4. Diga ao usuário onde vão ficar os arquivos: "Os PSDs e exportações desta pauta vão para Documentos › AI Designer › <slug>."

## Retomar existente

1. `node scripts/pauta.mjs listar` → mostre as pautas abertas pelo nome (não pelo slug).
2. `node scripts/pauta.mjs vincular <slug> --sessao <ID desta sessão>`
3. Leia o `handoff.md` da pauta e siga da **Próxima etapa**.

## Uma sessão = uma pauta

- Pedido que pertence a **outra** pauta → não misture. Diga: "Isso é de outra pauta. Para não misturar as anotações, abra uma conversa nova (`/clear` ou uma nova janela) e me diga qual pauta é."
- Pauta nova pedida no meio de outra → registre a atual com `ps-handoff` e oriente abrir conversa nova.

## Encerrar

1. Atualize o `handoff.md` (concluído, entregáveis na pasta de saída).
2. `node scripts/pauta.mjs encerrar <slug>`
3. Lembre: "Pauta fechada. Para a próxima, abra uma conversa nova."

## Saída

- PSD e exportações sempre na pasta de saída da pauta (`node scripts/pauta.mjs saida <slug>` devolve o caminho). Use esse caminho em `save_document_as` / exportações.
- Nunca salve PSD ou exportação dentro do repositório.
