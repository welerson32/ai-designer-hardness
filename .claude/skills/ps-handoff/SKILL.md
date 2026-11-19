---
name: ps-handoff
description: Registra o ponto de parada do trabalho no Photoshop em <pauta>/handoff.md e sugere ao usuário compactar a conversa. Use ao fechar uma macro-etapa (layout, tipografia, acabamento), após um preview avaliado, ou quando o usuário for encerrar a sessão.
---

# Handoff de sessão

Regras: `.claude/policies/sessao.md`.

1. Garanta o `<pauta>/estado.json` atualizado (camadas-chave com IDs; bounds `null` onde ficou incerto).
2. Atualize `<pauta>/handoff.md` (criado a partir de `templates/handoff.md` pela skill `ps-pauta`), **técnico e completo** — é lido por você, não pelo usuário. Mantenha o cabeçalho (nome, cliente, saída) e atualize: Decisões de design, Concluído, Próxima etapa, Pendências. Acrescente `Atualizado: <ISO-8601>`.
4. Não copie a lista de camadas: o hook já lê do `<pauta>/estado.json`.
5. Pauta continua → sugira compactar com a frase pronta (modelo na policy). Pauta concluída → skill `ps-pauta` (encerrar) e lembre de abrir conversa nova para a próxima.
