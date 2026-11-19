---
name: ps-visual-check
description: Decide como validar visualmente um resultado no Photoshop sem gastar visão. Use quando o critério de aceite parecer visual ou o usuário pedir para "ver" o resultado.
---

# Validação visual

Regras completas: `.claude/policies/visao.md`.

1. **Dá para responder por metadados?** (posição, tamanho, alinhamento, texto, visibilidade) → responda pelos números. Fim.
2. **Não dá** → peça ao usuário para conferir no Photoshop, dizendo exatamente o quê ("o título está legível sobre a foto?").
3. **Usuário pediu preview ou avaliação estética** → dispare `ps-art-director` com:
   - região alvo (bounds da camada/artboard do `.ps-state.json`) e `W`,`H` do canvas;
   - critérios objetivos do que avaliar;
   - limites (o que pode sugerir mudar).
4. Use o veredito em texto dele para planejar o próximo lote. A imagem não volta para cá.
