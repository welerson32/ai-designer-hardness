# scripts

O adb-mcp não executa arquivos de script (e `.jsx` não roda em plugin UXP). Aqui ficam:

- **`geo.mjs`** — cálculo de layout determinístico (`center`, `align`, `move-to`, `grid`, `distribute`). `node scripts/geo.mjs` sem argumentos mostra o uso.
- **`recipe.mjs`** — monta comandos a partir das receitas: `node scripts/recipe.mjs <receita> k=v ...` ou `--lote <arquivo>`.
- **`recipes/`** — receitas batchPlay enviadas por `call_batch_play_command` (servidor `photoshop-bp`).

Self-tests: `node scripts/geo.selftest.mjs` e `node scripts/recipe.selftest.mjs`.

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
| `active-layers` | IDs selecionados (leitura) | não |
| `layers-index` | índice compacto — só `ps-scout` (leitura) | não |
| `history-snapshot` | snapshot no início do lote (automático) | não |
| `revert-snapshot` | rollback de lote | não |
| `move-layer` | deslocar camada (dx, dy; dy+ = baixo) | não |
| `rename-layer` | renomear | não |
| `set-visibility` | mostrar/ocultar | não |
| `set-opacity` | opacidade | não |
| `play-action` | executar Action | não |
