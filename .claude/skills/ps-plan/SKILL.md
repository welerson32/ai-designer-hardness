---
name: ps-plan
description: Planeja e aplica uma etapa de trabalho no Photoshop como um lote único (<pauta>/etapas/<nome>.json) — calcula com geo.mjs, compila com recipe.mjs e aplica. Use sempre que for alterar o documento.
---

# Etapa = um lote

Quem decide, planeja e aplica é você (thread principal). Script faz conta e tradução; você nunca escreve descriptor à mão quando há receita.

## Passos

0. **Memória:** `node scripts/memoria.mjs buscar "<peça + etapa + elementos envolvidos>" --cliente <slug>` e siga à risca o que vier (junto com o núcleo da sessão). O plano não pode contrariar aprendizado registrado.
1. IDs/bounds no `<pauta>/estado.json`. Faltou nome/tipo de camada → `ps-scout` (todas as consultas da etapa numa chamada só). Canvas ou seleção ativa → leia você mesmo (`get_document_info`, receita `active-layers`).
2. Conta → `node scripts/geo.mjs` (`center`, `align`, `move-to`, `grid`, `distribute`, `pranchetas`). Nunca conta de cabeça.
3. Escreva `<pauta>/etapas/<NN-nome>.json` com **todas** as alterações da etapa:

```json
{
  "name": "02-alinhar-titulos",
  "doc": 101,
  "steps": [
    { "recipe": "move-layer", "params": { "layerId": 12, "dx": 0, "dy": 485 } },
    { "tool": "create_single_line_text_layer", "args": { "...": "..." } }
  ],
  "expect": [ { "layerId": 12, "bounds": { "left": 90, "top": 605, "right": 990, "bottom": 745 } } ]
}
```

4. `node scripts/recipe.mjs --lote <arquivo>` → chamadas na ordem (snapshot `lote:<nome>` já incluído; passos de receita consecutivos já vêm numa chamada só).
5. Aplique na ordem: `batchPlay` → `call_batch_play_command` com `commands` como vieram; `tool` → `mcp__photoshop__<name>` com `args`. Falhou → receita `revert-snapshot` (`name=lote:<nome>`) e avise.
6. Sucesso → grave `expect` no cache; camadas de escrita imprevisível → `bounds: null`.

## Regras

- Confirmação por lote só se houver escolha estética em aberto. Lote técnico segue direto.
- Um escritor por vez no documento.
- Sem receita para o que precisa → crie em `scripts/recipes/` (`validated: false`), não inline.
- Fluxo estável e repetitivo → Action nativa (`actions/README.md`), gravada sem diálogos modais; depois dela, `bounds: null` no que foi afetado.
- Camadas: nomes kebab-case, ajustes do Claude no grupo `claude/`, nunca apagar original (ocultar).
