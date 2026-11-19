---
name: ps-handoff
description: Registra o ponto de parada do trabalho no Photoshop em .ps-work/handoff.md e sugere ao usuário compactar a conversa. Use ao fechar uma macro-etapa (layout, tipografia, acabamento), após um preview avaliado, ou quando o usuário for encerrar a sessão.
---

# Handoff de sessão

Regras: `.claude/policies/sessao.md`.

1. Garanta o `.ps-state.json` atualizado (camadas-chave com IDs; bounds `null` onde ficou incerto).
2. Escreva `.ps-work/handoff.md` (substitui o anterior), **técnico e completo** — é lido por você, não pelo usuário:

```markdown
# Handoff — <nome da arte>
Atualizado: <ISO-8601>

## Objetivo
<o que a arte precisa entregar, formato, canal>

## Decisões de design (fixas)
- Paleta: ...
- Fontes / tamanhos: ...
- Grid / margens: ...

## Concluído
- <etapa>: <resultado em 1 linha>

## Próxima etapa
<objetivo + critério de aceite>

## Pendências / perguntas ao usuário
- ...
```

3. Não copie a lista de camadas: o hook já lê do `.ps-state.json`.
4. Sugira a compactação ao usuário com a frase pronta (modelo na policy), em linguagem de designer.
