# Execução em lotes

## Divisão de responsabilidade

| Etapa | Quem | Como |
|---|---|---|
| Decidir o quê | mentor (thread principal) | skill `ps-plan` |
| Calcular | script | `node scripts/geo.mjs` — nunca conta de cabeça |
| Traduzir em comandos | script | `node scripts/recipe.mjs --lote <arquivo>` |
| Aplicar | mentor (lote pequeno) ou `ps-operator` | chamadas na ordem devolvida pelo `recipe.mjs` |
| Etapa com decisão local | `ps-composer` | monta e aplica o próprio lote |

## Regras

1. **Lote = uma etapa inteira.** Planeje todas as alterações da etapa e aplique de uma vez. Não pare para pedir confirmação a cada micro-alteração.
2. **Confirmação por lote**, só quando houver escolha estética em aberto. Lote puramente técnico (alinhar, renomear, organizar) segue direto.
3. **Snapshot antes de cada lote**, automático (`recipe.mjs` insere `history-snapshot` com nome `lote:<nome>`). Falha no meio → `revert-snapshot` e reportar.
4. **Uma chamada por bloco.** Passos de receita consecutivos viram uma única chamada `call_batch_play_command`. Tools de alto nível (texto, generativo, place) quebram o bloco e vão em chamada própria, na ordem.
5. **Tamanho:** até ~5 comandos o mentor aplica direto; acima disso, `ps-operator` (Haiku), para a lista de comandos não passar pelo contexto caro.
6. **Um escritor por vez.** Nunca dois agentes escrevendo no mesmo documento em paralelo.
7. **Receita antes de descriptor novo.** Precisou de algo sem receita: escreva em `scripts/recipes/` (com `validated: false`), não inline. Validou no Photoshop → `validated: true`.

## Actions nativas

- Use Action quando o fluxo for **estável e repetitivo** (tratamento padrão, efeito recorrente, preparação de fechamento) — não por contagem de passos.
- Registro em `actions/README.md`; o `.atn` fica versionado em `actions/`.
- Gravar **sem diálogos modais** (desmarcar "toggle dialog"), senão a execução trava esperando clique.
- Action não devolve nada: após rodar, o estado afetado vira `bounds: null` no cache.

## Arquivo de lote

Em `.ps-work/` (ignorado pelo git). Formato em `.claude/skills/ps-plan/SKILL.md`.
