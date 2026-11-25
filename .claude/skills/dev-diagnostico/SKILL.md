---
name: dev-diagnostico
description: Modo desenvolvedor — diagnóstico ponta a ponta do harness numa máquina com Photoshop (ambiente, modelo, receitas, fluxo de peça, custo). Só para o mantenedor, nunca no uso diário.
disable-model-invocation: true
---

# Diagnóstico (modo desenvolvedor)

Quem pediu é o **mantenedor**, não o designer. Durante este fluxo:

- Ignore o output style `Designer` e o modo caveman: fale técnico, mostre comandos, IDs, descriptors e erros crus.
- Não abra pauta real nem toque em cliente real. Tudo numa pauta descartável `dev-teste`, sem cliente.
- Registre tudo em `workspace/dev/diagnostico-<AAAA-MM-DD>.md` (seções abaixo, uma linha por item: `OK | FALHA | PULADO — detalhe`). Esse arquivo é o que o mantenedor leva de volta.
- Falha num item → registre a mensagem exata do Photoshop/MCP e siga para o próximo, a menos que bloqueie o resto.

## 0. Ambiente

1. `git log --oneline -1` (versão do harness) e `claude --version`.
2. `node scripts/setup/doctor.mjs` → registre a saída. Problema `[auto]` → `node scripts/setup/install.mjs` e repita. Problema `[guiado]` → resolva com o mantenedor.
3. Self-tests: `node scripts/<nome>.selftest.mjs` para cada script e `node .claude/hooks/<nome>.selftest.cjs` para cada hook.
4. `/mcp`: `photoshop` e `photoshop-bp` conectados. Photoshop aberto com o painel do plugin em "Connected".
5. **Modelo:** confirme que esta sessão roda em Sonnet (o modelo atual aparece no contexto/`/status`). Peça ao mantenedor para tentar `/model opus` e registre se `availableModels` bloqueou ou não. Não bloqueou → registre "trava só por padrão, `availableModels` não vale em settings de projeto".
6. Hook de retomada: a injeção do `SessionStart` apareceu no contexto? Registre o tamanho aproximado (linhas).

## 0.1 Atualização e memória

1. `node scripts/setup/atualizar.mjs` → status (`em-dia`, `atualizado`, `alteracoes-locais`, `offline`…). `alteracoes-locais` → registre os arquivos; não descarte nada.
2. **Memória do designer (só leitura, nunca altere):** existe `workspace/metodo.md`? Quantos caracteres? Para cada `workspace/clientes/*/dossie.md`: tamanho e quantas linhas na seção Aprendizados. Registre só números, não o conteúdo.
3. `workspace/sessoes.json`: quantas sessões vinculadas por pauta. Muitas pautas com 1 sessão só e designer trabalhando vários dias = retomada sem vínculo (o dossiê não era carregado).
4. `echo '{"prompt":"já te falei que o logo fica embaixo"}' | node .claude/hooks/aprendizado.cjs` → deve imprimir o lembrete.
5. **Memória vetorial:** `node scripts/memoria.mjs importar` (idempotente) → quantos itens vieram de `metodo.md` e de cada dossiê; confira por amostra que o texto importado é idêntico ao original. `node scripts/memoria.mjs aquecer` (modelo local baixado?) e `node scripts/memoria.selftest.mjs` (inclui teste com o modelo real).
6. Três buscas reais com perguntas do dia a dia do designer (ex.: "como adapto o carrossel para story", "onde vai o logo") com `buscar ... --cliente <slug>` → o aprendizado certo veio em 1º? Registre consulta, top-3 e scores. Errou → anote quais `--termos` faltaram.
7. `node .claude/hooks/session-handoff.cjs --sessao <id de uma sessão vinculada>` → núcleo, dossiê e handoff aparecem inteiros? Tempo do hook de mensagem: `time (echo '{"prompt":"como adapto o post para story?"}' | node .claude/hooks/aprendizado.cjs)`.

## 1. Leitura

1. `get_documents` e `get_document_info` direto (sem scout).
2. `node scripts/pauta.mjs nova --nome "dev-teste" --sessao <ID desta sessão>`; `pauta.mjs saida dev-teste` → pasta de saída.
3. Pedido: 1 post `unico` `instagram-feed-retrato` + story `capa` com CTA "Saiba mais". Grave em `workspace/pautas/dev-teste/pedido-pecas.json` e rode `pecas.mjs plano`.

## 2. Receitas (todas estão `validated: false`)

Para cada receita, monte com `node scripts/recipe.mjs <receita> k=v ...` e envie por `call_batch_play_command`. Confira o efeito por leitura (`get_layer_bounds`, `get_document_info`) e, onde a leitura não basta, pergunte ao mantenedor o que ele vê no Photoshop. Funcionou → marque `"validated": true` no JSON da receita. Falhou → registre descriptor e erro; não corrija sem alinhar.

Ordem (cada uma prepara a seguinte):

1. `create_document` 1080x1350 (tool) → `history-snapshot` (`name=dev:inicio`).
2. `create-artboard` com o frame do `pecas.mjs ver dev-teste post-01`.
3. `active-layers` (selecione a prancheta antes) → ID devolvido.
4. `layers-index` → só confira o formato e o tamanho da resposta (registre bytes aproximados); não cole o índice inteiro no relatório.
5. Texto via `create_single_line_text_layer` (tool) → `layer-text` no ID dele.
6. `rename-layer`, `set-opacity` (50), `set-visibility` (hide → show), `create-group`, `add-guide` (vertical 540).
7. `move-layer` com `dy` **positivo** → confira em `get_layer_bounds` se desceu. Registre o sinal real e corrija a nota em `.claude/policies/leitura-estado.md` (seção 3). Repita com `translate_layer` (tool) e registre o sinal dele.
8. `revert-snapshot` (`name=dev:inicio`) → documento voltou ao estado inicial?
9. `save_document_as` PSD na pasta de saída (aprovação manual).
10. `select-document`, `duplicate-document` (`name=story-01`), `resize-artboard`, `delete-layer`, `close-document`.
11. `crop-document` e `resize-image` só numa cópia (`duplicate-document` antes).
12. `play-action`: só se houver Action registrada em `actions/README.md`; senão PULADO.

## 3. Fluxo real de uma peça

Agora como no uso diário, para medir: siga a skill `ps-plan` (planejar → `geo.mjs` → lote → `recipe.mjs --lote` → aplicar).

1. Etapa "layout": título centralizado na prancheta com margem 90px, subtítulo 24px abaixo, um retângulo/forma de fundo. Um lote só.
2. Confira `expect` × `get_layer_bounds` real. Divergência → registre os dois valores.
3. Lote propositalmente quebrado (receita com `layerId` inexistente no meio) → o rollback por `revert-snapshot` funcionou?
4. `ps-scout`: peça duas buscas (nome exato + tipo `text`) numa chamada. Registre tempo e se o `batchplay-guard` deixou passar só `get`/`multiGet`.
5. `ps-art-director`: preview da prancheta com o critério "título legível e centralizado". Registre se a cópia `claude-preview` foi fechada e se o guard barrou algo.
6. Exportação: `node scripts/exportar.mjs dev-teste post-01 --doc <id>` e aplique. Confira os arquivos na pasta de saída.
7. Story a partir do post (seção "Montagem de um story" em `.claude/policies/pecas.md`) até salvar `story-01.psd`.

## 4. Custo e tempo

1. `node scripts/dev/uso.mjs` → cole a saída no relatório (tokens por modelo, agentes, ferramentas, duração).
2. `/context` → registre o peso de system prompt, CLAUDE.md, ferramentas MCP e skills.
3. Anote quantas telas de aprovação apareceram e em quais ferramentas (candidatas a liberar no `settings.json`).

## 5. Insumo para aplicar lote por script (próxima etapa)

Leia `vendor/adb-mcp/mcp/` (cliente socket usado por `ps-mcp.py`/`ps-batch-play.py`) e o proxy (`vendor/adb-mcp/adb-proxy-socket/` ou equivalente). Registre:

- biblioteca e versão do socket.io; URL/porta; nome do evento de envio e de resposta;
- formato exato do payload de um `batchPlay` e de uma tool de alto nível (ex.: `create_single_line_text_layer`), e da resposta (sucesso e erro);
- timeout e como uma resposta é casada com o pedido (id?).

## 6. Fechamento

1. Feche documentos de teste sem salvar o que não for necessário; `pauta.mjs encerrar dev-teste`.
2. Resumo no topo do relatório: o que bloqueia uso real, receitas que falharam, sinal do eixo Y, custo da sessão.
3. Receitas validadas e a nota do eixo Y alteradas no repositório → mostre o `git diff` ao mantenedor; commit só se ele pedir (inclua-as no mesmo commit do relatório).
4. Para levar o relatório: copie para `docs/diagnosticos/<data>-diagnostico.md` **anonimizado** (clientes como cliente-A/B, sem caminhos pessoais nem conteúdo de dossiê) e faça commit — o repositório é público. O mantenedor remove o arquivo depois da análise.
