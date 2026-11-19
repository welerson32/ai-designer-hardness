# Higiene de sessão e subagentes

## Por quê

Todo turno reenvia o contexto inteiro. Conversa longa = cada passo fica mais caro e mais lento, e o modelo perde precisão. O estado da arte já vive fora da conversa (`.ps-state.json` + handoff), então a conversa pode ser enxugada sem perder nada.

## Ciclo de vida

1. **Fim de macro-etapa** (ex.: layout fechado → tipografia; tipografia → acabamento; após um preview avaliado):
   - escreva `.ps-work/handoff.md` (skill `ps-handoff`);
   - sugira ao usuário compactar, com a frase pronta para copiar (ver abaixo).
2. **Retomada automática:** o hook `SessionStart` (`.claude/hooks/session-handoff.cjs`) injeta handoff + resumo do `.ps-state.json` + perfil ao iniciar, retomar ou depois de compactar. Não é preciso reler arquivo nem consultar o Photoshop para lembrar onde parou.
3. Na retomada, **confirme com o usuário** se o documento aberto é o mesmo antes da próxima etapa.

## Como sugerir ao usuário (designer para designer)

> Fechamos o layout. Antes da tipografia, vale "limpar a mesa": guardei as anotações do projeto. Copie e envie:
> `/compact Mantenha só o handoff e as decisões de design`
> Depois disso eu continuo de onde paramos.

Alternativa: fechar e abrir uma conversa nova — o resumo é carregado sozinho.

Não sugira compactar no meio de uma etapa, nem mais de uma vez por etapa.

## Subagentes

- **Reconhecimento sempre fora da thread principal** (`ps-scout`, Haiku): achar camada por nome/tipo, mapear pasta de assets, reler posição. A thread principal recebe só o resumo.
- **Paralelo só para leitura:** vários `ps-scout` ao mesmo tempo podem (ex.: um mapeia a pasta de assets enquanto outro busca camadas). Escrita no documento: um agente por vez.
- **Prompt de subagente completo:** objetivo, IDs/nomes, critérios, formato de saída. O subagente não vê a conversa.
- **Não dispare subagente para 1–2 chamadas simples** — a partida dele custa mais que a tarefa.
