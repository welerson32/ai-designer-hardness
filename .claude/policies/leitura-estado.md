# Leitura e estado do documento

## 1. Sem dump de camadas

- `mcp__photoshop__get_layers` é **negado** em `.claude/settings.json` (devolve a árvore inteira, com estilo de texto).
- Toda leitura pela thread principal, via `node scripts/aplicar.mjs` (resposta sem a árvore de camadas):
  - `--tool get_document_info '{}'` — canvas em px e resolução;
  - `--receita active-layers` — IDs selecionados;
  - `--camadas nome=<exato> tipo=<texto|pixel|grupo|smartObject|corSolida|fundo> prancheta=<id>` — o script lê o índice inteiro e devolve **só** as camadas que casam (id, nome, tipo, pai, visível, bounds). Junte o que precisa numa busca; nunca sem filtro em documento grande.

## 2. Cache `<pauta>/estado.json`

Na pasta da pauta (`workspace/pautas/<slug>/`, ignorada pelo git). Escrito pela thread principal a partir das leituras e dos lotes (`expect` / `real`). **Uma entrada por peça** (cada peça é um PSD); `ativa` = peça em que se está trabalhando.

```json
{
  "version": 2,
  "ativa": "post-01",
  "pecas": {
    "post-01": {
      "doc": { "id": 101, "title": "post-01.psd", "width": 1080, "height": 1350, "resolution": 72, "at": "2026-11-19T14:02:00Z" },
      "pranchetas": [ { "nome": "folha-01", "id": 5 }, { "nome": "folha-02", "id": 9 } ],
      "active": { "ids": [12], "at": "2026-11-19T14:02:00Z" },
      "layers": [
        { "id": 12, "name": "titulo-principal", "kind": "text", "parentId": 5,
          "bounds": { "left": 90, "top": 120, "right": 990, "bottom": 260 }, "boundsAt": "2026-11-19T14:02:00Z" }
      ]
    }
  },
  "notes": []
}
```

Validade:

- Trocou de peça → mude `ativa` e selecione o PSD dela (receita `select-document` com `doc.id`) antes de escrever. Um escritor por vez, um PSD por vez.
- `doc.id` da peça ativa diferente do documento ativo no Photoshop → cache **daquela peça** inválido.
- `id`, `name`, `kind`, `parentId` e canvas → confiáveis enquanto o documento for o mesmo.
- `bounds` → confiável só até a próxima escrita na camada:
  - escrita previsível (`translate_layer`, `move_layer`): o mentor **recalcula** localmente e atualiza o cache, sem reler;
  - escrita imprevisível (texto editado, escala com efeitos, generativo, `select_subject`): `bounds: null`; releitura (`aplicar.mjs --camadas`) só quando precisar.
- Usuário avisou que mexeu no arquivo → descartar `active` e todos os `bounds`.

## 3. Cálculo local

Com `W,H` (canvas) e `b = {left,top,right,bottom}` da camada **sem efeitos**; `w = right-left`, `h = bottom-top`:

- Centralizar horizontal: `dx = (W - w)/2 - left`
- Centralizar vertical: `dy = (H - h)/2 - top`
- Margem `m`: esquerda `dx = m - left`; direita `dx = (W - m) - right`; topo `dy = m - top`; base `dy = (H - m) - bottom`
- Grid de `n` colunas, gutter `g`, margem `m`: `col = (W - 2m - (n-1)·g)/n`; x da coluna `i` (base 0) = `m + i·(col + g)`
- Arredondar para inteiro só no fim.

`translate_layer(layer_id, x_offset, y_offset)` e a receita `move-layer` recebem **deslocamento**, não posição. **Y positivo desce** nos dois (validado no Photoshop em 2026-11-25; a docstring do adb-mcp, que diz "positivo = sobe", está errada).
