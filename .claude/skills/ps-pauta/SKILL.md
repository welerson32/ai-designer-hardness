---
name: ps-pauta
description: Abre, retoma ou encerra uma pauta de trabalho (uma demanda com vários posts e seus stories) e amarra a sessão atual a ela. Use no início de toda sessão sem pauta, quando o usuário pedir algo novo, ou ao concluir uma pauta.
---

# Pautas

Uma pauta = uma demanda de design = um handoff = **uma sessão**. O ID da sessão vem no contexto injetado pelo hook (`ID desta sessão: ...`).

## Abrir nova

1. Pergunte, em linguagem de designer, o nome da pauta e o cliente (se houver).
2. `node scripts/pauta.mjs nova --nome "<nome>" [--cliente "<cliente>"] --sessao <ID desta sessão>`
3. `node .claude/hooks/session-handoff.cjs --sessao <ID desta sessão>` → carrega método do designer e dossiê do cliente (com Aprendizados) nesta conversa. Obrigatório: o carregamento automático só acontece no início da conversa, antes de a pauta existir.
4. Veja `clienteStatus` na saída do passo 2: `inexistente` ou `em-cadastro` → explique que o cliente precisa ser cadastrado primeiro (skill `ps-cliente`, em conversa própria) e pergunte se quer fazer isso antes; `pronto` → siga.
5. Peça a pauta recebida e colete (regras em `.claude/policies/pecas.md`):
   - **quantos posts e de que tipo** — post único ou carrossel (quantas folhas) — e o formato;
   - **o story de cada post** — "feed inteiro" ou "só a capa com CTA" (e o texto do CTA). Pergunte post a post ou "todos iguais?"; nunca presuma;
   - **os textos**, página por página, e as características esperadas.
   Faltou algo essencial → pergunte antes de abrir o Photoshop.
6. Grave `<pauta>/pedido-pecas.json` (`{"posts":[{"tipo":"unico|carrossel","paginas":N,"formato":"instagram-feed-retrato","stories":"feed|capa","cta":"..."}]}`) e rode `node scripts/pecas.mjs plano <slug> --pedido workspace/pautas/<slug>/pedido-pecas.json`.
7. Confirme com o designer em linguagem de design, curto: "São 12 arquivos: 6 posts (2 carrosséis de 5 folhas, 4 únicos) e 6 stories (4 com o feed inteiro, 2 só com a capa e CTA). Confere?"
8. Registre no **Briefing** do handoff: posts e stories e textos **literais** por peça e página. Preencha **Objetivo** e **Decisões de design** já passadas (formato base em `templates/formatos.json`; identidade = dossiê do cliente, carregado no passo 3).
9. Diga onde vão ficar os arquivos: "Os PSDs e as imagens desta pauta vão para Documentos › AI Designer › <slug>."

## Retomar existente

1. `node scripts/pauta.mjs listar` → mostre as pautas abertas pelo nome (não pelo slug).
2. `node scripts/pauta.mjs vincular <slug> --sessao <ID desta sessão>`
3. `node .claude/hooks/session-handoff.cjs --sessao <ID desta sessão>` → carrega handoff, método do designer, dossiê do cliente (com Aprendizados) e estado. Obrigatório: sem isso, as correções que o designer já fez não chegam a esta conversa.
4. Siga da **Próxima etapa** do handoff.

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
