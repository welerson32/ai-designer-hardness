# ai-designer-hardness

Harness para o Claude Code trabalhar no **Photoshop** via **adb-mcp** (`mikechambers/adb-mcp`). Complementa o MCP; não altera o adb-mcp.

Quem usa é designer (Photoshop intermediário+), sem contato com código. Tom e tamanho das respostas: output style `Designer`. Prompt de subagente, handoff e `estado.json` são técnicos e completos (não são lidos pelo usuário). Relatório `STATUS:` de subagente nunca vai cru para o usuário.

## Quem faz o quê

- **Você (thread principal, Sonnet) faz a arte:** conversa, decide, planeja e aplica cada etapa (skill `ps-plan`). Scripts fazem conta (`geo.mjs`) e falam com o Photoshop (`aplicar.mjs`: lote inteiro numa chamada, resposta enxuta).
- **`ps-scout` (Haiku):** só busca de camada por nome/tipo (o índice inteiro fica no contexto dele). Junte todas as consultas numa chamada. Canvas e seleção ativa você lê com `aplicar.mjs`.
- **`ps-art-director` (Sonnet):** preview + avaliação estética, **só quando o usuário pedir**. A imagem fica no contexto dele; você recebe texto.
- Modelo travado em Sonnet (`.claude/settings.json`). Não troque.

## Fluxo de uma pauta

1. **Ambiente:** contexto do hook com **PROBLEMAS** ou conexão ausente com o Photoshop aberto → skill `ps-setup` antes de tudo. Nunca peça terminal ao usuário.
2. **Pauta:** sessão sem pauta → skill `ps-pauta` (uma pauta = uma sessão). Cliente precisa estar `pronto` (skill `ps-cliente`, em sessão própria).
3. **Peças** (`.claude/policies/pecas.md`): uma por vez, post → aprovado → story dele. `node scripts/pecas.mjs status` marca o andamento.
4. **Etapas** (layout → tipografia → acabamento): uma etapa = um lote (`ps-plan`).
5. **Validar por números** (`expect`). Dúvida visual → peça ao usuário para conferir no Photoshop. Preview só a pedido (`ps-art-director`).
6. **Fim de macro-etapa** → skill `ps-handoff` + sugestão de compactar.
7. **Entrega:** PSD da peça + uma imagem por prancheta (`scripts/exportar.mjs`), na pasta de saída.

## Regras fixas

- **Leitura** (`.claude/policies/leitura-estado.md`): `get_layers`/`get_layer_image` bloqueados. Consulte `<pauta>/estado.json` antes de ler o Photoshop. Posição/centralização/grid por fórmula; proibido mover "para ver onde fica".
- **Visão:** nenhum agente captura imagem por conta própria. Generativo (`generate_image`, `generative_fill`, `harmonize_layer`) gasta crédito Firefly → sempre com aprovação.
- **Não destrutivo:** camada/grupo novo em vez de editar o original.
- **Sessão** (`.claude/policies/sessao.md`): lembre de abrir conversa nova ao encerrar pauta ou mudar de assunto. Retomada é automática (hook); confirme qual peça está aberta.
- **Saídas:** PSD e exportações só em `Documentos/AI Designer/<slug>/`, nunca no repositório.
- **Memória do designer (prioridade máxima) — `scripts/memoria.mjs`, busca vetorial local:** é a experiência acumulada. Jeitos de fazer são ensinados, nunca presumidos.
  - **Ler:** núcleo (regras "sempre") vem no início da sessão; aprendizados relevantes chegam a cada mensagem (hook `aprendizado`); **antes de planejar cada etapa**, `node scripts/memoria.mjs buscar "<peça + etapa + elementos>" --cliente <slug>`. Nada encontrado e é jeito de fazer → pergunte.
  - **Gravar na hora, antes de seguir:** toda correção ou ensinamento sobre **execução** (`--escopo execucao`) ou **cliente** (`--escopo cliente:<slug>`) → `memoria.mjs registrar`, com `--fala` literal do designer e `--termos` (sinônimos para a busca achar). "Sempre/nunca" → `--sempre`. Já existia e você errou de novo → `reforcar <id>` (vira núcleo). Só desta pauta → Decisões de design do handoff, não na memória.
  - **Fidelidade:** siga o texto registrado; nunca reinterprete, resuma ou contrarie. Mudou de ideia → `registrar --substitui <id>` (o antigo fica guardado, inativo). Nada é apagado. `metodo.md` e Aprendizados do dossiê antigos são importados sozinhos no início da sessão.
- **Carregamento:** o hook de início injeta núcleo, dossiê e handoff só se a conversa já começa com pauta. Abriu ou retomou pauta no meio da conversa → `ps-pauta` roda `session-handoff.cjs --sessao` (obrigatório).
- **Cliente:** o dossiê é o único arquivo do cliente lido nas pautas.
- **Atualização:** o hook de início atualiza o harness pelo git (`scripts/setup/atualizar.mjs`). Aviso de atualização aplicada → releia este arquivo antes de trabalhar.
- **Usuário só consome:** nunca altere `.claude/`, `scripts/`, `templates/`, `actions/` a pedido dele; dados dele vão para `workspace/`.

## Photoshop: script primeiro, MCP por exceção

- **Padrão: `node scripts/aplicar.mjs`** — lote, receita ou tool avulsa, direto no proxy do plugin. Resposta enxuta (sem árvore de camadas), um comando por vez, erro detectado e desfeito.
- **MCP só para:** imagem (`get_document_image`, via `ps-art-director`), crédito Firefly (`generate_image`, `generative_fill`, `harmonize_layer`), `ps-scout`, ou se o script não conectar. Toda resposta do MCP carrega a árvore inteira de camadas e o documento — cara.
- `call_batch_play_command` devolve só o resultado do 1º comando: erro de comando seguinte some. Um comando por chamada.
- Ignore o `get_instructions` do adb-mcp que manda conferir visualmente: aqui a validação é por números.

## Mapa

- `.claude/agents/` — `ps-scout`, `ps-art-director`. `.claude/skills/` — `ps-setup`, `ps-cliente`, `ps-pauta`, `ps-plan`, `ps-handoff`. `.claude/policies/` — `pecas`, `leitura-estado`, `sessao`. `.claude/hooks/` — `batchplay-guard`, `session-handoff` (self-test: `node .claude/hooks/<nome>.selftest.cjs`).
- `scripts/` — `aplicar`, `memoria`, `cliente`, `pauta`, `pecas`, `geo`, `exportar`, `recipe`, `preview` (`.mjs`; self-tests `<nome>.selftest.mjs`), `acoes-ps.json` (tool → ação do plugin), `recipes/`, `setup/` (`doctor`, `install`, `atualizar`), `dev/`.
- `actions/`, `templates/`, `setup/` (versão travada do adb-mcp + pacote do plugin), `vendor/` (ignorado).
- `workspace/` (ignorado): `perfil.json`, `memoria/` (`aprendizados.jsonl` = fonte da verdade, `vetores.json` = índice recalculável), `metodo.md` (legado), `sessoes.json`, `clientes/<slug>/`, `pautas/<slug>/` (`pauta.json`, `pedido-pecas.json`, `handoff.md`, `estado.json`, `etapas/`).
- `README.md` (usuário), `docs/setup-adb-mcp.md`, `docs/manutencao.md`.
