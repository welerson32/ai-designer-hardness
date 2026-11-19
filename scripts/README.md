# scripts

O adb-mcp não executa arquivos de script (e `.jsx` não roda em plugin UXP). Aqui ficam **receitas batchPlay**: JSON enviado pela tool `call_batch_play_command` (servidor `photoshop-bp`).

## Formato

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

- `{{param}}` é substituído antes do envio; parâmetro numérico vira número, sem aspas.
- `call_batch_play_command` **só devolve o resultado do 1º comando**. Receita de leitura = 1 comando.
- `validated: true` só depois de rodar no Photoshop e conferir o retorno.

## Índice

| Receita | Uso | Validada |
|---|---|---|
| `recipes/active-layers.json` | IDs selecionados | não |
| `recipes/layers-index.json` | índice compacto (scout) | não |
