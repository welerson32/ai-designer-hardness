---
name: ps-setup
description: Prepara, valida e repara o ambiente do harness (conexão com o Photoshop, dependências, plugin). Use quando o contexto do hook "Checagem do ambiente" apontar problema, na primeira vez que o projeto é aberto, ou quando o Photoshop não responder.
---

# Setup e reparo

Público leigo em tecnologia: **faça tudo o que der sozinho**; guie só o que exige clique da pessoa. Fale de designer para designer — nada de nomes de ferramenta, versão ou comando na conversa.

## 1. Diagnóstico

`node scripts/setup/doctor.mjs` → `itens` com `id`, `ok`, `tipo` (`auto` | `guiado`).

## 2. Reparo automático (`tipo: auto`)

- Antes, uma linha: "Vou preparar a conexão com o Photoshop — leva alguns minutos e pode pedir sua aprovação algumas vezes."
- `node scripts/setup/install.mjs tudo` (ou só os passos que falharam, na ordem: `uv`, `vendor`, `python`, `proxy-deps`, `plugin-pasta`, `workspace`, `proxy`).
- **Node ausente** (o hook avisou que não conseguiu rodar): `winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements`, depois peça para a pessoa **fechar e abrir o Claude Code** e siga.
- `uv` recém-instalado pode não estar no PATH da sessão — o script já procura nos locais padrão; se falhar, peça para reabrir o Claude Code.
- Rode o diagnóstico de novo. Passo que continuar falhando → explique em uma linha o que não deu certo e o que fazer; não insista em loop.

## 3. Etapas guiadas (`tipo: guiado`) — uma por vez, conferindo no fim de cada uma

**Photoshop ausente ou antigo** (precisa ser o 2025 ou mais novo):
> Abra o app **Creative Cloud**, vá em **Apps** e instale ou atualize o **Photoshop** para a versão mais recente. Me avise quando terminar.

**Plugin** — primeiro tente `node scripts/setup/install.mjs plugin`:
- Instalou → siga para a conexão.
- `SEM_INSTALADOR` / `FALHOU` → abra a pasta com o pacote selecionado (`explorer.exe /select,<caminho do .ccx>`) e diga: "Abri a pasta com o instalador do plugin. Dê dois cliques no arquivo selecionado e confirme no Creative Cloud."
- `SEM_PACOTE` → **gerar o pacote pelo UXP Developer Tool** (feito uma vez por computador; o plugin fica instalado de vez). Guie **um passo por mensagem**, esperando a pessoa confirmar:

> **1. Instalar o UXP Developer Tool**
> Abra o app **Creative Cloud** › **Apps** › **Todos os apps**. Na busca, digite **UXP Developer Tools** e clique em **Instalar**. Me avise quando terminar.

> **2. Ativar o modo de desenvolvedor no Photoshop**
> No Photoshop: **Editar › Preferências › Plug-ins** e marque **Ativar modo de desenvolvedor** (em inglês: *Edit › Preferences › Plugins › Enable Developer Mode*). Reinicie o Photoshop. Ao abrir o UXP Developer Tool pela primeira vez, se ele pedir para ativar o modo de desenvolvedor, aceite.

> **3. Adicionar o plugin**
> No UXP Developer Tool, clique em **Add Plugin**. Vou abrir a pasta certa para você: selecione o arquivo **manifest.json** e confirme.

   Antes de enviar o passo 3, rode `explorer.exe /select,<raiz>\vendor\adb-mcp\uxp\ps\manifest.json`.

> **4. Gerar o instalador**
> Na linha do **Photoshop MCP Agent**, clique nos **três pontinhos (•••)** › **Package**. Quando pedir onde salvar, escolha a pasta que vou abrir agora e salve com o nome sugerido.

   Antes do passo 4, rode `node scripts/setup/install.mjs plugin-pasta` e `explorer.exe <raiz>\vendor\plugin`. Se o arquivo salvo tiver outro nome, renomeie para `photoshop-mcp-agent.ccx` (`vendor/plugin/`).

> **5. Instalar**
   Rode `node scripts/setup/install.mjs plugin`; se falhar, abra a pasta com o arquivo selecionado e peça o duplo clique. Pode haver um aviso do Creative Cloud sobre plugin de fonte externa — confirme.

   Depois disso o UXP Developer Tool não é mais necessário; o modo de desenvolvedor pode ficar como está.

- **Nunca** use o botão **Load** do UXP Developer Tool como solução: ele carrega o plugin só até o Photoshop fechar.

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
