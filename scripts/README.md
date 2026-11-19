# scripts

O adb-mcp não executa arquivos de script (e `.jsx` não roda em plugin UXP). Aqui ficam:

- **`pauta.mjs`** / **`cliente.mjs`** — pautas (nova, listar, vincular, saída, encerrar) e clientes (nova, listar, checar lacunas, concluir).
- **`geo.mjs`** — cálculo de layout determinístico (`center`, `align`, `move-to`, `grid`, `distribute`). `node scripts/geo.mjs` sem argumentos mostra o uso.
- **`exportar.mjs`** — gera o lote que exporta cada folha do carrossel como imagem separada.
- **`recipe.mjs`** — monta comandos a partir das receitas: `node scripts/recipe.mjs <receita> k=v ...` ou `--lote <arquivo>`.
- **`preview.mjs`** — chamadas do preview barato (duplicar → recortar → ≤ 800px → capturar → fechar cópia). Uso exclusivo do `ps-art-director`.
- **`recipes/`** — receitas batchPlay enviadas por `call_batch_play_command` (servidor `photoshop-bp`).

Self-tests: `node scripts/<nome>.selftest.mjs` (`cliente`, `pauta`, `geo`, `exportar`, `recipe`, `preview`).

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
| `layer-text` | estilo de texto da camada (estudo do guia de cliente) | não |
| `duplicate-document` | cópia para preview | não |
| `crop-document` | recorte (só na cópia) | não |
| `resize-image` | redução (só na cópia) | não |
| `close-document` | fechar cópia por nome, sem salvar | não |
| `select-document` | ativar documento pelo ID | não |
| `create-artboard` | criar prancheta (carrossel: uma só, tamanho total) | não |
| `add-guide` | guia vertical/horizontal | não |
| `create-group` | grupo de camadas (folha-NN, continuo) | não |
