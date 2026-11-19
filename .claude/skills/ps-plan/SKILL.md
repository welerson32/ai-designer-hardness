---
name: ps-plan
description: Monta o lote de uma etapa de trabalho no Photoshop em formato fixo e enxuto (.ps-work/<nome>.json), pronto para recipe.mjs e ps-operator. Use sempre que for alterar o documento.
---

# Planejar um lote

## Passos

1. Garanta no `.ps-state.json` os IDs e bounds necessários (faltou → `ps-scout`).
2. Calcule todo deslocamento/posição com `node scripts/geo.mjs` (`center`, `align`, `move-to`, `grid`, `distribute`).
3. Escreva `.ps-work/<NN-nome>.json`:

```json
{
  "name": "02-alinhar-titulos",
  "doc": 101,
  "steps": [
    { "recipe": "move-layer", "params": { "layerId": 12, "dx": 0, "dy": 485 } },
    { "recipe": "rename-layer", "params": { "layerId": 14, "name": "subtitulo" } },
    { "tool": "create_single_line_text_layer", "args": { "...": "..." } },
    { "recipe": "play-action", "params": { "set": "Harness", "action": "web-export" } }
  ],
  "expect": [
    { "layerId": 12, "bounds": { "left": 90, "top": 605, "right": 990, "bottom": 745 } }
  ]
}
```

- `steps`: `recipe` (de `scripts/recipes/`) ou `tool` (tool do MCP `photoshop`). Sem texto explicativo.
- `expect`: bounds previstos das camadas com escrita previsível — vão direto para o cache após o lote.
- `snapshot: false` só para lote somente de leitura (raro).

4. Confira: `node scripts/recipe.mjs --lote .ps-work/<arquivo>.json` (erro = parâmetro faltando ou receita inexistente).
5. Aplique conforme `.claude/policies/execucao-lotes.md` (direto ou `ps-operator`).
6. Sucesso → grave `expect` no `.ps-state.json`; camadas com escrita imprevisível → `bounds: null`.
