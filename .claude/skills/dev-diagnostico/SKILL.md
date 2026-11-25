---
name: dev-diagnostico
description: Modo desenvolvedor — diagnóstico ponta a ponta do harness numa máquina com Photoshop (ambiente, modelo, receitas, fluxo de peça, custo). Só para o mantenedor, nunca no uso diário.
disable-model-invocation: true
---

# Diagnóstico (modo desenvolvedor)

Quem pediu é o **mantenedor**, não o designer. Durante este fluxo:

- Ignore o output style `Designer` e o modo caveman: fale técnico, mostre comandos, IDs, descriptors e erros crus.
- Não abra pauta real nem altere cliente real. Tudo numa pauta descartável `dev-teste`.
- Registre tudo em `workspace/dev/diagnostico-<AAAA-MM-DD>.md` (uma linha por item: `OK | FALHA | PULADO — detalhe`).
- Falha num item → registre a mensagem exata e siga, a menos que bloqueie o resto.
- Toda conversa com o Photoshop via `node scripts/aplicar.mjs` (não pelo MCP), salvo onde indicado.

## 0. Ambiente

1. `git log --oneline -1`; `node scripts/setup/atualizar.mjs`; `node scripts/setup/doctor.mjs` (problema `[auto]` → `node scripts/setup/install.mjs tudo`).
2. Self-tests: todos os `scripts/*.selftest.mjs`, `scripts/setup/*.selftest.mjs` e `.claude/hooks/*.selftest.cjs`.
3. **Com o mantenedor:** `/mcp` (photoshop e photoshop-bp conectados), `/model opus` (a trava `availableModels` bloqueou?), `/context` (peso de system prompt, CLAUDE.md, ferramentas MCP, skills — principal suspeito do custo fixo por requisição).

## 1. Memória

1. `node scripts/memoria.mjs importar` (idempotente) e `aquecer`.
2. `echo '{"prompt":"já te falei que o logo fica embaixo"}' | node .claude/hooks/aprendizado.cjs` → lembrete.
3. Calibração: 5 perguntas **com** resposta e 3 **sem**, `node scripts/memoria.mjs buscar "<pergunta>" --cliente <slug> --k 3`. Registre o `cos` do item certo e o maior `cos` das sem resposta. Corte atual `MIN_COS = 0.815` (rodada 3: certo mínimo 0,796, sem resposta máximo 0,799).

## 2. Leitura e pendências do script

1. `aplicar.mjs --tool get_document_info '{}'` → tamanho da saída.
2. **Busca de camadas sem agente:** doc com 3 pranchetas e ~10 camadas → `aplicar.mjs --camadas tipo=texto`, `--camadas nome=<exato>`, `--camadas prancheta=<id>`. Confere com o Painel Camadas? Tempo de cada (antes: ~13 s com subagente).
3. **Fontes:** `aplicar.mjs --fontes nomes=Raleway-Regular,Altone-Bold,<outras do identidade.json>` → `faltando` bate com o que está instalado? (receita `font-list`, `validated: false`).
4. **Fechar o último documento:** lote com `close-document` → `OK` com `avisos` (erro falso conhecido)?
5. **1ª prancheta engole o fundo:** lote `create_document` → `create-artboard` → `aplicar.mjs --camadas nome="Camada 0"` → `delete-layer` → fundo sumiu e a prancheta ficou limpa?
6. **Gravar, não adivinhar** (precisa do mantenedor no Photoshop): `resize-artboard` (prancheta 1080x1350 → 1080x1920 no painel Propriedades) e `add-guide`. Grave uma Action fazendo à mão → painel Ações, botão direito no passo → **Copiar como JavaScript** → cole no relatório, corrija a receita, teste com `aplicar.mjs --receita` e marque `validated: true` só se conferir.

## 3. Fluxo real de uma peça (medir)

Siga `ps-plan` como no uso diário (memória → `geo.mjs` → lote → `aplicar.mjs`):

1. Carrossel de 3 folhas: pranchetas, fundo, título e subtítulo em cada folha (`select-layer` na prancheta antes de criar cada texto). Subtítulo em 2 lotes (criar → ler `real` → posicionar).
2. `ps-art-director` numa folha ("título legível e centralizado").
3. Exportar (`exportar.mjs` + `aplicar.mjs`).
4. Story a partir do post: se o item 2.6 corrigiu `resize-artboard`, completo; senão registre onde parou.
5. Telas de aprovação: quantas e em quais ferramentas.

## 4. Custo

`node scripts/dev/uso.mjs` → requisições, cache read e tempo. Compare com a rodada 3 (57 req, 6,2M cache read, ~109k por requisição) e com o benchmark do post 04 (~243k por requisição).

## 5. Fechamento

1. Documentos de teste fechados; `pauta.mjs encerrar <slug da dev-teste>`.
2. Resumo no topo do relatório: o que bloqueia uso real, o que mudou de custo, receitas que falharam.
3. Receitas corrigidas/validadas → no mesmo commit do relatório.
4. Relatório em `docs/diagnosticos/<data>-diagnostico.md` **anonimizado** (clientes como cliente-A/B, sem caminhos pessoais nem conteúdo de dossiê) → commit **e push** (o repositório é público; o mantenedor remove depois da análise).
