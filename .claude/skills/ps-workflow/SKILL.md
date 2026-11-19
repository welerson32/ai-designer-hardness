---
name: ps-workflow
description: Fluxo padrão para qualquer tarefa de design no Photoshop via adb-mcp. Use no início de toda tarefa que vá alterar um documento.
---

# Fluxo de tarefa no Photoshop

1. **Inspecionar (barato):** liste documentos e camadas; leia dimensões e nomes. Sem captura de imagem.
2. **Planejar:** escreva a lista numerada de operações (camada alvo, ação, parâmetros). Confirme com o usuário se houver escolha estética.
3. **Executar:**
   - ≤ 2 operações → execute direto.
   - 3+ operações mecânicas → delegue ao agente `ps-operator` com a lista.
4. **Validar:** confira por metadados. Só use `ps-visual-check` se o critério de aceite for visual.
5. **Registrar (opcional):** se algo novo foi aprendido, anote em `docs/sessions/`.
