# Manutenção do harness

Para quem mantém o projeto (não para o designer).

## Atualizar a versão do adb-mcp

1. Escolha o commit novo do `mikechambers/adb-mcp` e teste localmente.
2. Atualize `commit` em `setup/adb-mcp.lock.json`.
3. O pacote do plugin é regerado sozinho na máquina de cada usuário a partir do `vendor/` (passo `plugin-pacote`). Se o plugin mudou, o usuário precisa reinstalar: o `ps-setup` cuida disso quando a conexão falhar.
4. Rode os self-tests e `node scripts/setup/doctor.mjs`.
5. Commit + push. Na próxima sessão, o hook de cada usuário detecta a versão diferente e o `ps-setup` atualiza o `vendor/` sozinho.

## Pacote do plugin (`.ccx`)

Automático: `install.mjs plugin-pacote` compacta `vendor/adb-mcp/uxp/ps` (zip via `tar.exe` do Windows) em `vendor/photoshop-mcp-agent.ccx`, e `install.mjs plugin` instala pelo instalador da Adobe.

**Plano B** (se o Creative Cloud recusar o pacote gerado): gere pelo **UXP Developer Tool** › Add Plugin (`vendor/adb-mcp/uxp/ps/manifest.json`) › **•••** › **Package**, salve em `setup/plugin/photoshop-mcp-agent.ccx` e faça commit — o instalador passa a usar esse arquivo no lugar do gerado.

## Validações pendentes no Photoshop

- `install.mjs plugin-pacote` / `plugin`: Creative Cloud aceitar o `.ccx` gerado por zip e a sintaxe `/install` do UnifiedPluginInstallerAgent.
- `.mcp.json`: `uv run --directory vendor/adb-mcp/mcp --no-sync` com o ambiente criado por `uv sync --no-install-project`.
- Painel do plugin carregado na abertura do Photoshop com **Connect on Launch** marcado (se o painel não abrir sozinho, a conexão não acontece).
- Receitas em `scripts/recipes/` (`validated: false`).
