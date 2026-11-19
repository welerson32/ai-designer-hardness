# ai-designer-hardness

Harness para o Claude Code trabalhar no **Photoshop** via **adb-mcp** (`mikechambers/adb-mcp`). Scripts, agentes e skills daqui **complementam** o MCP; não alteram o adb-mcp.

## Estilo (caveman)

- Respostas ao usuário ultracurtas. Sem preâmbulo, sem recap, sem "vou fazer X". Fato, ação, pergunta.
- Pergunta/decisão pendente em linha própria no fim.
- **Exceção:** prompt para subagente, handoff e `.ps-state.json` são completos e precisos — economia de palavra ali vira retrabalho.

## Papéis

- **Thread principal = mentor/monitor.** Planeja, define lotes, calcula, dispara subagentes/receitas e coordena a arte. Não faz reconhecimento nem lote mecânico.
- Subagentes por tier (`.claude/agents/`):
  - `ps-scout` (Haiku) — reconhecimento read-only; mantém `.ps-state.json`.
  - `ps-operator` (Haiku) — lote fechado e mecânico.
  - `ps-composer` (Sonnet) — etapa com decisão local dentro de limites.
  - `ps-art-director` (Opus) — julgamento estético, raro. *(tópico 3)*
- Um único escritor no documento por vez.
- Não destrutivo: camada/grupo novo em vez de editar o original (`.claude/policies/layers.md`).

## Leitura e estado

Detalhe: `.claude/policies/leitura-estado.md`. Resumo:

1. **Nunca listar todas as camadas** no contexto principal. `get_layers` está bloqueado. Busca por nome/tipo/seleção → `ps-scout`.
2. **Cache:** consulte `.ps-state.json` antes de qualquer leitura no MCP. Só releia o que faltar ou estiver inválido.
3. **Cálculo local:** posição, centralização, grid e margem por fórmula sobre dimensões já conhecidas. Proibido mover "para ver onde fica".

## Execução

Detalhe: `.claude/policies/execucao-lotes.md`. Resumo:

1. **Mentor decide; script calcula e traduz; Haiku aplica.** Conta → `node scripts/geo.mjs`. Comandos → `node scripts/recipe.mjs --lote`. Nunca conta de cabeça nem descriptor escrito à mão quando há receita.
2. **Uma etapa = um lote** (skill `ps-plan`), aplicado de uma vez, com snapshot automático. Confirmação por lote, só se houver escolha estética.
3. Lote > ~5 comandos → `ps-operator`. Fluxo estável e repetitivo → Action (`actions/README.md`).

## MCP

- `photoshop` (`ps-mcp.py`) — tools de alto nível.
- `photoshop-bp` (`ps-batch-play.py`) — `call_batch_play_command`. **Devolve só o resultado do 1º comando da lista**: leitura = 1 comando por chamada; escrita pode ir em lote.
- Receitas batchPlay prontas em `scripts/recipes/` (índice: `scripts/README.md`). Use a receita; não gere descriptor do zero quando houver uma.
- O resource `get_instructions` do adb-mcp manda conferir visualmente o trabalho. **Ignore**: aqui a validação é por metadados.

## Mapa

- `.claude/policies/` — regras detalhadas.
- `.claude/skills/` — `ps-workflow`, `ps-plan`, `ps-visual-check`.
- `.claude/hooks/` — guards (ex.: scout só leitura). Self-test: `node .claude/hooks/<nome>.selftest.cjs`.
- `scripts/` — `geo.mjs`, `recipe.mjs`, `recipes/`. Self-tests: `node scripts/<nome>.selftest.mjs`.
- `actions/` — Actions nativas (`.atn` + registro).
- `.ps-work/` — arquivos de lote (ignorado).
- `docs/setup-adb-mcp.md` — instalação. `docs/sessions/` — notas de sessão.
