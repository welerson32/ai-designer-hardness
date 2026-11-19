---
name: ps-workflow
description: Fluxo padrão para qualquer tarefa de design no Photoshop via adb-mcp. Use no início de toda tarefa que vá alterar um documento.
---

# Fluxo de tarefa no Photoshop

1. **Estado:** leia `.ps-state.json`. Faltou ID, bounds ou canvas → `ps-scout`, só o que falta (nome exato, tipo ou seleção ativa).
2. **Etapas:** quebre a tarefa em etapas (ex.: layout → tipografia → acabamento). Uma etapa = um lote.
3. **Por etapa, escolha o executor:**
   - decisão é toda do mentor → skill `ps-plan` (calcula com `geo.mjs`, escreve o lote) e aplica conforme `.claude/policies/execucao-lotes.md`;
   - etapa com decisão local dentro de limites → `ps-composer` com objetivo, critério de aceite e limites.
4. **Validar:** por metadados (`expect` do lote). `ps-visual-check` só se o critério de aceite for visual.
5. **Fim de etapa grande:** avaliar handoff/compactação (tópico 4).
