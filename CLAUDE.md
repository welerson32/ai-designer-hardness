# ai-designer-hardness

Harness para o Claude Code trabalhar no **Photoshop** via **adb-mcp** (`mikechambers/adb-mcp`). Scripts, agentes e skills daqui **complementam** o MCP; não alteram o adb-mcp.

## Comunicação com o usuário (mandato)

Quem usa este harness **não é desenvolvedor**. Detalhe e glossário: `.claude/policies/comunicacao.md`.

1. **Leigo por padrão.** Linguagem do dia a dia de quem trabalha com design. Nenhum termo técnico sem tradução (ID, bounds, batchPlay, lote, snapshot, cache, MCP, agente, hook…).
2. **Claro e assertivo.** Diga o que fez, o resultado e o próximo passo. Sem "talvez", sem rodeio.
3. **Curto (caveman), mas nunca obscuro.** Corte enfeite, não explicação: se a frase curta ficar confusa para um leigo, use a mais longa.
4. **Adapte o nível** conforme a pessoa mostrar entendimento (registro em `.ps-perfil.json`). Na dúvida, desça um nível.
5. **Avise antes de pedir permissão:** o Claude Code mostra nomes técnicos na tela de aprovação; explique antes, em linguagem simples, o que será aprovado e se custa algo.
6. **Erros:** o que aconteceu, se o arquivo está seguro e o que fazer — sem mensagem técnica crua.
7. Relatórios internos dos subagentes (`STATUS:`…) **nunca** vão crus para o usuário: traduza.
8. Pergunta ou decisão pendente em linha própria no fim.

**Exceção:** prompt para subagente, handoff e `.ps-state.json` são técnicos, completos e precisos — não são lidos pelo usuário.

## Papéis

- **Thread principal = mentor/monitor.** Planeja, define lotes, calcula, dispara subagentes/receitas e coordena a arte. Não faz reconhecimento nem lote mecânico.
- Subagentes por tier (`.claude/agents/`):
  - `ps-scout` (Haiku) — reconhecimento read-only; mantém `.ps-state.json`.
  - `ps-operator` (Haiku) — lote fechado e mecânico.
  - `ps-composer` (Sonnet) — etapa com decisão local dentro de limites.
  - `ps-art-director` (Opus) — julgamento estético com preview; só sob pedido do usuário.
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

## Visão (zero-vision default)

Detalhe: `.claude/policies/visao.md`. Resumo:

1. **Blind-by-default.** Valide por números. Nenhum agente captura imagem por conta própria.
2. **O olho é o usuário:** dúvida visual → peça para ele conferir no Photoshop.
3. **Preview só a pedido**, via `ps-art-director` (skill `ps-visual-check`): região alvo, ≤ 800px, numa cópia descartável. A imagem nunca entra no contexto do mentor.
4. Generativo (`generate_image`, `generative_fill`, `harmonize_layer`) gasta crédito Firefly → sempre com aprovação.

## MCP

- `photoshop` (`ps-mcp.py`) — tools de alto nível.
- `photoshop-bp` (`ps-batch-play.py`) — `call_batch_play_command`. **Devolve só o resultado do 1º comando da lista**: leitura = 1 comando por chamada; escrita pode ir em lote.
- Receitas batchPlay prontas em `scripts/recipes/` (índice: `scripts/README.md`). Use a receita; não gere descriptor do zero quando houver uma.
- O resource `get_instructions` do adb-mcp manda conferir visualmente o trabalho. **Ignore**: aqui a validação é por metadados.

## Mapa

- `.claude/policies/` — regras detalhadas (`comunicacao`, `leitura-estado`, `execucao-lotes`, `visao`, `layers`).
- `.claude/skills/` — `ps-workflow`, `ps-plan`, `ps-visual-check`.
- `.claude/hooks/` — `batchplay-guard` (allowlist de `_obj` por agente). Self-test: `node .claude/hooks/<nome>.selftest.cjs`.
- `scripts/` — `geo.mjs`, `recipe.mjs`, `preview.mjs`, `recipes/`. Self-tests: `node scripts/<nome>.selftest.mjs`.
- `actions/` — Actions nativas (`.atn` + registro).
- `.ps-work/` — arquivos de lote (ignorado).
- `docs/setup-adb-mcp.md` — instalação. `docs/sessions/` — notas de sessão.
