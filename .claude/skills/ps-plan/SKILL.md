---
name: ps-plan
description: Planeja e aplica uma etapa de trabalho no Photoshop como um lote único (<pauta>/etapas/<nome>.json) — calcula com geo.mjs e aplica com aplicar.mjs. Use sempre que for alterar o documento.
---

# Etapa = um lote

Quem decide, planeja e aplica é você (thread principal). Script faz conta e tradução; você nunca escreve descriptor à mão quando há receita.

## Passos

0. **Memória:** `node scripts/memoria.mjs buscar "<peça + etapa + elementos envolvidos>" --cliente <slug>` e siga à risca o que vier (junto com o núcleo da sessão). O plano não pode contrariar aprendizado registrado.
1. IDs/bounds no `<pauta>/estado.json`. Faltou camada → `node scripts/aplicar.mjs --camadas nome=… tipo=… prancheta=…` (uma busca com tudo da etapa). Canvas ou seleção ativa → `node scripts/aplicar.mjs --tool get_document_info '{}'` / `--receita active-layers`.
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

4. **Aplique com uma chamada:** `node scripts/aplicar.mjs <pauta>/etapas/<arquivo>.json`. Ele cria o snapshot `lote:<nome>`, manda comando a comando, detecta erro (inclusive o que o Photoshop devolve como "sucesso"), desfaz pelo snapshot e confere o `expect`. Saída enxuta: `status` (`OK` | `OK_COM_DIVERGENCIA` | `ERRO`), `falha`, `rollback`, `expect`, `doc`.
   - `ERRO` → a arte voltou ao estado anterior; avise e corrija o lote. `OK_COM_DIVERGENCIA` → o `real` de cada camada vai para o cache.
   - `conexão indisponível` → `ps-setup`. Só como último recurso, aplique pelo MCP (`call_batch_play_command` um comando por chamada; cada resposta do MCP traz a árvore inteira de camadas — caro).
5. Sucesso → grave `expect` (ou o `real` devolvido) no cache; camadas de escrita imprevisível → `bounds: null`.
6. Tool sem mapeamento em `scripts/acoes-ps.json` ou de imagem/crédito (`generate_image`, `generative_fill`, `harmonize_layer`, `get_document_image`) → fora do lote, pela tool do MCP, com aprovação.

## Regras

- Confirmação por lote só se houver escolha estética em aberto. Lote técnico segue direto.
- Um escritor por vez no documento.
- Sem receita para o que precisa → crie em `scripts/recipes/` (`validated: false`), não inline. Receita `validated: false` só com o designer avisado; agrupar camadas = tool `group_layers`.
- Fluxo estável e repetitivo → Action nativa (`actions/README.md`), gravada sem diálogos modais; depois dela, `bounds: null` no que foi afetado.
- **Camada nova nasce acima/dentro da camada ativa:** antes de criar texto/pixel/imagem numa prancheta, passo `select-layer` com o id da prancheta (ou de uma camada dela).
- **Texto em relação a outro texto** (ex.: subtítulo 24px abaixo do título): a altura real do texto só existe depois de criado. Crie num lote, leia o `real` devolvido e posicione no lote seguinte.
- Camadas: nomes kebab-case, ajustes do Claude no grupo `claude/`, nunca apagar original (ocultar).
