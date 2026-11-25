# Higiene de sessão, pautas e subagentes

## Por quê

Todo turno reenvia o contexto inteiro. Conversa longa = cada passo fica mais caro e mais lento, e o modelo perde precisão. O estado da arte já vive fora da conversa (handoff + `estado.json` da pauta), então a conversa pode ser enxugada sem perder nada.

## Pautas

- **Uma pauta = uma demanda de design = um handoff = uma sessão.** Skill `ps-pauta`.
- Dados da pauta em `workspace/pautas/<slug>/` (`pauta.json`, `handoff.md`, `estado.json`, `etapas/`). PSD e exportações em `Documentos/AI Designer/<slug>/`.
- O hook `SessionStart` sabe qual pauta pertence a esta sessão (`workspace/sessoes.json`, gravado por `pauta.mjs vincular`).
- **Sempre lembrar o usuário** de abrir conversa nova: ao encerrar uma pauta, ao pedir uma pauta nova no meio de outra, e quando o assunto for de outra pauta.

## Ciclo de vida dentro da pauta

1. **Início:** sessão sem pauta → o hook lista as abertas → pergunte qual seguir ou se é nova (`ps-pauta`).
2. **Fim de macro-etapa** (layout fechado → tipografia; tipografia → acabamento; após um preview avaliado):
   - atualize o handoff (skill `ps-handoff`);
   - sugira compactar, com a frase pronta (abaixo).
3. **Após compactar:** o hook reinjeta handoff + estado + perfil da pauta da sessão. Não reler arquivo nem consultar o Photoshop para lembrar onde parou.
4. **Retomada:** confirme com o usuário se o arquivo aberto no Photoshop é o desta pauta antes da próxima etapa.

## Como sugerir (designer para designer)

> Fechamos o layout. Antes da tipografia, vale "limpar a mesa": guardei as anotações desta pauta. Copie e envie:
> `/compact Mantenha só o handoff e as decisões de design`
> Depois disso eu continuo de onde paramos.

> Pauta fechada — os arquivos estão em Documentos › AI Designer › <pasta>. Para a próxima peça, abra uma conversa nova (`/clear` ou nova janela) e me diga qual é.

Não sugira compactar no meio de uma etapa, nem mais de uma vez por etapa.

## Subagentes

- Leitura do documento e mapeamento de pastas: thread principal (`aplicar.mjs --camadas`, Glob). Subagente só o `ps-art-director`, a pedido.
- **Não dispare subagente para 1–2 chamadas simples** (canvas, seleção ativa, aplicar lote) — a partida dele custa mais que a tarefa.
- **Prompt de subagente completo:** objetivo, pasta da pauta (`workspace/pautas/<slug>`), peça, nomes, formato de saída. O subagente não vê a conversa.
- Escrita no documento: só a thread principal.
