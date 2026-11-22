# Instalação (técnica)

O designer **não** precisa ler isto: ao abrir o Claude Code na pasta do projeto, o hook de checagem roda e a skill `ps-setup` instala ou repara tudo, guiando só o que exige clique (Photoshop, plugin, conexão).

## O que é instalado

| Item | Onde | Como |
|---|---|---|
| Node LTS | sistema | `winget` (se faltar) |
| uv (traz o Python) | usuário | `winget` ou instalador oficial |
| adb-mcp no commit do lock | `vendor/adb-mcp` (ignorado pelo git) | `git clone` + `checkout` |
| Ambiente Python do MCP | `vendor/adb-mcp/mcp/.venv` | `uv sync --no-install-project` |
| Dependências do proxy | `vendor/adb-mcp/adb-proxy-socket/node_modules` | `npm install` |
| Proxy (porta 3001) | processo em segundo plano | iniciado pelo hook a cada sessão; log em `vendor/proxy.log` |
| Pacote do plugin | `setup/plugin/` (mantenedor) ou `vendor/plugin/` (usuário) | UXP Developer Tool › Package |
| Plugin do Photoshop | Creative Cloud | instalador da Adobe (`UnifiedPluginInstallerAgent /install`) ou duplo clique |

## Comandos

- Diagnóstico: `node scripts/setup/doctor.mjs` (`--rapido` pula o teste de conexão).
- Instalar/reparar: `node scripts/setup/install.mjs tudo` ou passos (`uv`, `vendor`, `python`, `proxy-deps`, `plugin-pasta`, `workspace`, `proxy`, `plugin`).
- Self-tests: `node .claude/hooks/<batchplay-guard|session-handoff>.selftest.cjs`, `node scripts/<cliente|pauta|pecas|geo|exportar|recipe|preview>.selftest.mjs` e `node scripts/setup/mcp-check.selftest.mjs`.

## Requisitos

- Windows 10/11 com Git (já exigido pelo Claude Code).
- Photoshop 2025 (v26) ou mais novo.
- Abrir o Claude Code **na raiz do projeto** (o `.mcp.json` usa caminho relativo para `vendor/`).

Manutenção (versão do adb-mcp, pacote do plugin): `docs/manutencao.md`.
