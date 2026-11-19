---
name: ps-workflow
description: Fluxo padrão para qualquer tarefa de design no Photoshop via adb-mcp. Use no início de toda tarefa que vá alterar um documento.
---

# Fluxo de tarefa no Photoshop

1. **Estado:** leia `.ps-state.json`. Faltou ID, bounds ou canvas → peça ao `ps-scout` só o que falta (nome exato, tipo ou seleção ativa).
2. **Calcular:** posições e deslocamentos por fórmula (`.claude/policies/leitura-estado.md` §3). Nada de tentativa e erro no documento.
3. **Planejar:** lista numerada de operações (camada alvo, ação, parâmetros já calculados). Confirme com o usuário só se houver escolha estética.
4. **Executar:**
   - ≤ 2 operações → execute direto.
   - 3+ operações mecânicas → `ps-operator` com a lista.
5. **Atualizar cache:** escrita previsível → recalcule bounds e grave no `.ps-state.json`; imprevisível → `bounds: null`.
6. **Validar:** por metadados. `ps-visual-check` só se o critério de aceite for visual.
