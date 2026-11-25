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

## 2. Aplicação por script e receitas pendentes

Tudo aqui via `node scripts/aplicar.mjs` (não pelo MCP). Receitas já validadas (`validated: true`) não precisam ser retestadas.

1. `aplicar.mjs --tool get_documents '{}'` e `--tool get_document_info '{}'` → conecta? A saída vem sem árvore de camadas? Registre o tamanho da saída (caracteres).
2. `create_document` 1080x1350 via lote de 1 passo → registre se o erro `allLocked` ainda aparece e se o `aplicar` trata como `ERRO` (o documento é criado mesmo assim).
3. **`create-artboard` (versão nova):** lote com o frame de `pecas.mjs ver <slug> post-01`. Confira: nome aplicado? Fundo ficou fora da prancheta? Outra prancheta lado a lado (frame da folha-02) também?
4. **`group_layers`** (tool, substitui a receita removida `create-group`) com 2 camadas de texto → grupo contém as duas?
5. **Erro detectado:** lote com `rename-layer` em `layerId` inexistente no meio → `status: ERRO`, `rollback: feito`, documento igual ao de antes?
6. **`expect`:** lote com `move-layer` e `expect` certo → `OK`; com `expect` errado de propósito → `OK_COM_DIVERGENCIA` com o `real`.
7. **Descriptors que faltam — gravar, não adivinhar:** para `resize-artboard` (prancheta 1080x1350 → 1080x1920 no painel Propriedades) e `add-guide`: grave uma Action fazendo a operação à mão, no painel Ações clique com o direito no passo → **Copiar como JavaScript**, cole no relatório e corrija a receita. Teste com `aplicar.mjs --receita` e marque `validated: true` só se conferir.
8. **Exportação de carrossel** (agora achata a cópia antes de recortar): PSD com 3 pranchetas lado a lado → `exportar.mjs` + `aplicar.mjs` → 3 imagens com o conteúdo certo de cada folha?
9. `play-action`: só se houver Action registrada em `actions/README.md`; senão PULADO.

## 3. Fluxo real de uma peça

Agora como no uso diário, para medir: siga a skill `ps-plan` (memória → `geo.mjs` → lote → `aplicar.mjs`).

1. Etapa "layout": título centralizado na prancheta com margem 90px, subtítulo 24px abaixo, um retângulo/forma de fundo. Um lote só, uma chamada de `aplicar.mjs`.
2. `expect` conferido pelo próprio `aplicar` → bateu?
3. Compare com a rodada anterior: chamadas de ferramenta e tokens da etapa (seção 4).
4. `ps-scout`: peça duas buscas (nome exato + tipo `text`) numa chamada. Registre tempo e se o `batchplay-guard` deixou passar só `get`/`multiGet`.
5. `ps-art-director`: preview da prancheta com o critério "título legível e centralizado". Registre se a cópia `claude-preview` foi fechada e se o guard barrou algo.
6. Exportação: `node scripts/exportar.mjs dev-teste post-01 --doc <id>` e aplique. Confira os arquivos na pasta de saída.
7. Story a partir do post (seção "Montagem de um story" em `.claude/policies/pecas.md`) até salvar `story-01.psd`.

## 4. Custo e tempo

1. `node scripts/dev/uso.mjs` → cole a saída no relatório (tokens por modelo, agentes, ferramentas, duração).
2. `/context` → registre o peso de system prompt, CLAUDE.md, ferramentas MCP e skills.
3. Anote quantas telas de aprovação apareceram e em quais ferramentas (candidatas a liberar no `settings.json`).

## 5. Calibrar a memória

Com os clientes reais importados: 5 perguntas que **têm** resposta na memória e 3 que **não têm** (ex.: "onde vai o logo" num cliente sem aprendizado de logo), cada uma com `node scripts/memoria.mjs buscar "<pergunta>" --cliente <slug> --k 3`. Registre o `cos` do item certo e o maior `cos` das perguntas sem resposta. O corte do hook é `MIN_COS = 0.815` em `scripts/memoria.mjs`: ajuste se os números pedirem.

## 6. Fechamento

1. Feche documentos de teste sem salvar o que não for necessário; `pauta.mjs encerrar dev-teste`.
2. Resumo no topo do relatório: o que bloqueia uso real, receitas que falharam, sinal do eixo Y, custo da sessão.
3. Receitas validadas e a nota do eixo Y alteradas no repositório → mostre o `git diff` ao mantenedor; commit só se ele pedir (inclua-as no mesmo commit do relatório).
4. Para levar o relatório: copie para `docs/diagnosticos/<data>-diagnostico.md` **anonimizado** (clientes como cliente-A/B, sem caminhos pessoais nem conteúdo de dossiê) e faça commit — o repositório é público. O mantenedor remove o arquivo depois da análise.
