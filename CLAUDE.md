# ai-designer-hardness

Harness de IA para trabalho de design no **Photoshop**, operado pelo Claude via **adb-mcp** (MCP server + plugin UXP + proxy local).

## Princípios (economia primeiro)

1. **Estrutura antes de pixel.** Inspecione o documento por metadados (camadas, dimensões, nomes) antes de qualquer captura de imagem.
2. **Imagem é cara.** Captura/preview só quando a decisão depender de olhar o resultado — e sempre em resolução reduzida. Ver `ps-visual-check`.
3. **Planeje, depois execute em lote.** Monte a sequência de operações antes de chamar o MCP; evite tentativa-e-erro no documento.
4. **Delegue o mecânico.** Operações repetitivas vão para o agente `ps-operator` (modelo mais barato); decisão estética fica na sessão principal.
5. **Não destrutivo.** Nova camada/grupo em vez de editar a original; nomes de camada descritivos.

## Mapa

- `.claude/skills/ps-workflow` — fluxo padrão de uma tarefa no Photoshop.
- `.claude/skills/ps-visual-check` — quando e como validar visualmente.
- `.claude/agents/ps-operator` — executor de operações em lote.
- `.claude/rules/` — convenções (nomenclatura de camadas, custos).
- `docs/setup-adb-mcp.md` — instalação e conexão.
- `docs/sessions/` — registro curto de sessões (o que funcionou, custo percebido).

## Pendências

- [ ] Incorporar as preocupações de economia/otimização levantadas pelo autor.
- [ ] Validar nomes reais das tools expostas pelo adb-mcp e refinar skills.
