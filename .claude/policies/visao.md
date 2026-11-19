# Visão (zero-vision default)

## Por quê

- Custo de imagem ≈ `largura × altura / 750` tokens (a API reduz acima de ~1568px no lado maior). Qualidade JPEG **não** muda o custo.
- O caro é o acúmulo: imagem que entra no contexto é reenviada em todo turno seguinte.
- As tools do adb-mcp capturam em **resolução total** (sem parâmetro de tamanho) → payload pesado no socket (timeout de 20s do proxy).
- O usuário vê o Photoshop na tela: **o olho padrão é o usuário**.

## Regras

1. **Blind-by-default.** Validação por metadados: bounds, `expect` do lote, propriedades de texto. Nenhum agente captura imagem por conta própria.
2. **Dúvida visual → pergunte ao usuário** ("confere o título no PS?") antes de pensar em preview.
3. **Preview só quando o usuário pedir**, e sempre via `ps-art-director` (Opus, contexto isolado): a imagem nunca entra no contexto do mentor.
4. **Forma fixa do preview** (`node scripts/preview.mjs`): duplicar documento → recortar à região alvo (camada/artboard pelos bounds) → reduzir para lado maior ≤ 800px → `get_document_image` → fechar a cópia sem salvar. Nunca o documento inteiro em resolução total.
5. **Uma captura por pedido.** Antes/depois só se pedido.

## Enforcement

- `.claude/settings.json`:
  - `deny` → `get_layer_image` (resolução total; usar o fluxo de preview).
  - `ask` → `get_document_image` (cada captura passa pela sua aprovação — **não** marque "sempre permitir").
  - `ask` → `generate_image`, `generative_fill`, `harmonize_layer` (consomem créditos Firefly).
- Hook `batchplay-guard --preview-only` no `ps-art-director`: só `get`, `multiGet`, `duplicate`, `crop`, `imageSize`, `close`; `crop`/`imageSize` só na mesma chamada depois de `duplicate`.
