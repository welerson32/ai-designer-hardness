---
name: ps-setup
description: Prepara, valida e repara o ambiente do harness (conexão com o Photoshop, dependências, plugin). Use quando o contexto do hook "Checagem do ambiente" apontar problema, na primeira vez que o projeto é aberto, ou quando o Photoshop não responder.
---

# Setup e reparo

Público leigo em tecnologia: **faça tudo o que der sozinho**; guie só o que exige clique da pessoa. Fale de designer para designer — nada de nomes de ferramenta, versão ou comando na conversa.

## 1. Diagnóstico

`node scripts/setup/doctor.mjs` → `itens` com `id`, `ok`, `tipo` (`auto` | `guiado` | `manutencao`).

## 2. Reparo automático (`tipo: auto`)

- Antes, uma linha: "Vou preparar a conexão com o Photoshop — leva alguns minutos e pode pedir sua aprovação algumas vezes."
- `node scripts/setup/install.mjs tudo` (ou só os passos que falharam, na ordem: `uv`, `vendor`, `python`, `proxy-deps`, `plugin-pacote`, `workspace`, `proxy`).
- **Node ausente** (o hook avisou que não conseguiu rodar): `winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements`, depois peça para a pessoa **fechar e abrir o Claude Code** e siga.
- `uv` recém-instalado pode não estar no PATH da sessão — o script já procura nos locais padrão; se falhar, peça para reabrir o Claude Code.
- Rode o diagnóstico de novo. Passo que continuar falhando → explique em uma linha o que não deu certo e o que fazer; não insista em loop.

## 3. Etapas guiadas (`tipo: guiado`) — uma por vez, conferindo no fim de cada uma

**Photoshop ausente ou antigo** (precisa ser o 2025 ou mais novo):
> Abra o app **Creative Cloud**, vá em **Apps** e instale ou atualize o **Photoshop** para a versão mais recente. Me avise quando terminar.

**Plugin** (antes de guiar, tente `node scripts/setup/install.mjs plugin`):
- Instalou → siga para a conexão.
- Falhou → abra a pasta do pacote para a pessoa (`explorer.exe /select,<caminho do .ccx da mensagem>`) e diga: "Abri a pasta com o instalador do plugin. Dê dois cliques no arquivo selecionado e confirme a instalação no Creative Cloud."
- O pacote é gerado sozinho a partir do adb-mcp baixado; se nem isso funcionar, explique que é preciso falar com quem mantém o projeto.

**Conexão** (Photoshop aberto, plugin instalado, `plugin-conectado` = falso):
> 1. No Photoshop, abra o menu **Plugins** › **Photoshop MCP Agent**.
> 2. No painel, marque **Connect on Launch** — assim ele se conecta sozinho toda vez que o Photoshop abrir.
> 3. Clique em **Connect**.
> 4. Deixe o painel encaixado num canto (pode minimizar, só não feche).
> Me avise quando fizer.

Depois de cada etapa: `node scripts/setup/doctor.mjs` e confirme em linguagem simples ("Pronto, estou conectado ao seu Photoshop.").

## Regras

- Nunca peça para a pessoa abrir terminal ou digitar comando (exceto `/compact` e similares do próprio Claude Code).
- Nunca edite `.claude/`, `scripts/`, `setup/` para "consertar" — problema no harness vai para quem mantém.
