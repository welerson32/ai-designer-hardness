---
name: ps-workflow
description: Fluxo padrão para qualquer tarefa de design no Photoshop via adb-mcp. Use no início de toda tarefa que vá alterar um documento.
---

# Fluxo de tarefa no Photoshop

0. **Pauta:** sessão sem pauta vinculada → skill `ps-pauta` primeiro. `<pauta>` = `workspace/pautas/<slug>`.
1. **Peça:** trabalhe uma peça por vez, na ordem do plano (`node scripts/pecas.mjs listar <slug>`): post → aprovado → story dele (`.claude/policies/pecas.md`). Marque o andamento com `pecas.mjs status`.
2. **Estado:** leia `<pauta>/estado.json` (entrada da peça ativa). Faltou ID, bounds ou canvas → `ps-scout`, só o que falta (nome exato, tipo ou seleção ativa).
3. **Etapas:** quebre a tarefa em etapas (ex.: layout → tipografia → acabamento). Uma etapa = um lote.
4. **Por etapa, escolha o executor:**
   - decisão é toda do mentor → skill `ps-plan` (calcula com `geo.mjs`, escreve o lote) e aplica conforme `.claude/policies/execucao-lotes.md`;
   - etapa com decisão local dentro de limites → `ps-composer` com objetivo, critério de aceite e limites.
5. **Validar:** por metadados (`expect` do lote). `ps-visual-check` só se o critério de aceite for visual.
6. **Fim de peça ou macro-etapa:** skill `ps-handoff`.
7. **Salvar/exportar:** `<peca>.psd` + uma imagem por prancheta (`scripts/exportar.mjs`), sempre na pasta de saída da pauta.
