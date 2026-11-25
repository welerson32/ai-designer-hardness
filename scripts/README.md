# scripts

O adb-mcp não executa arquivos de script (e `.jsx` não roda em plugin UXP). Aqui ficam:

- **`pauta.mjs`** / **`cliente.mjs`** — pautas (nova, listar, vincular, saída, encerrar) e clientes (nova, listar, checar lacunas, concluir).
- **`aplicar.mjs`** — fala direto com o plugin pelo proxy (porta 3001): aplica lote comando a comando, detecta erro (inclusive `_obj:"error"` devolvido como sucesso), desfaz pelo snapshot, confere `expect` e devolve JSON enxuto, sem a árvore de camadas. Também `--receita`/`--tool` avulsas. Mapa tool → ação do plugin em `acoes-ps.json` (gerado do `ps-mcp.py` da versão travada).
- **`memoria.mjs`** — memória do designer (aprendizados de execução e por cliente) com busca vetorial local (modelo `multilingual-e5-base` em `vendor/memoria/`) + palavra-chave; fallback só palavra-chave.
- **`pecas.mjs`** — plano das peças da pauta (posts + stories, 1 PSD por peça, 1 prancheta por página), andamento e CTA.
- **`geo.mjs`** — cálculo de layout determinístico (`center`, `align`, `move-to`, `grid`, `distribute`, `pranchetas`). `node scripts/geo.mjs` sem argumentos mostra o uso.
- **`exportar.mjs`** — gera o lote que exporta uma imagem por prancheta da peça.
- **`recipe.mjs`** — monta comandos a partir das receitas: `node scripts/recipe.mjs <receita> k=v ...` ou `--lote <arquivo>`.
- **`preview.mjs`** — chamadas do preview barato (duplicar → recortar → ≤ 800px → capturar → fechar cópia). Uso exclusivo do `ps-art-director`.
- **`recipes/`** — receitas batchPlay enviadas por `call_batch_play_command` (servidor `photoshop-bp`).

Self-tests: `node scripts/<nome>.selftest.mjs` (`aplicar`, `cliente`, `pauta`, `memoria`, `pecas`, `geo`, `exportar`, `recipe`, `preview`).

## Formato de receita

```json
{
  "description": "o que faz",
  "server": "photoshop-bp",
  "params": { "layerId": "int" },
  "commands": [ { "_obj": "...", "_id": "{{layerId}}" } ],
  "returns": "formato da resposta",
  "validated": false
}
```

- `"{{param}}"` sozinho na string vira o valor tipado (número fica número); dentro de texto, é interpolado.
- `params` deve listar exatamente os placeholders usados (o self-test confere).
- `call_batch_play_command` **só devolve o resultado do 1º comando**. Receita de leitura = 1 comando.
- `validated: true` só depois de rodar no Photoshop e conferir.

## Índice

| Receita | Uso | Validada |
|---|---|---|
| `active-layers` | IDs selecionados (leitura) | sim |
| `layers-index` | índice compacto — só `ps-scout` (leitura) | sim |
| `history-snapshot` | snapshot no início do lote (automático) | sim |
| `revert-snapshot` | rollback de lote | sim |
| `move-layer` | deslocar camada (dx, dy; dy+ = baixo) | sim |
| `rename-layer` | renomear | sim |
| `set-visibility` | mostrar/ocultar | sim |
| `set-opacity` | opacidade | sim |
| `play-action` | executar Action | não |
| `layer-text` | estilo de texto da camada (estudo do guia de cliente) | sim |
| `duplicate-document` | cópia para preview | sim |
| `crop-document` | recorte (só na cópia) | não |
| `resize-image` | redução (só na cópia) | sim |
| `close-document` | fechar cópia por nome, sem salvar | sim |
| `select-document` | ativar documento pelo ID | sim |
| `create-artboard` | criar prancheta (uma por página) | não |
| `resize-artboard` | redimensionar prancheta (post → story) | não |
| `delete-layer` | apagar camada/prancheta (story só-capa, na cópia) | sim |
| `add-guide` | guia vertical/horizontal | não |
| ~~`create-group`~~ | removida: criava grupo vazio — usar a tool `group_layers` (`group_name`, `layer_ids`) | — |
