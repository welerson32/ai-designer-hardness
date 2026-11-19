# Manutenção do harness

Para quem mantém o projeto (não para o designer).

## Atualizar a versão do adb-mcp

1. Escolha o commit novo do `mikechambers/adb-mcp` e teste localmente.
2. Atualize `commit` em `setup/adb-mcp.lock.json`.
3. Se o plugin mudou (`uxp/ps/`), gere o pacote novo (abaixo) e atualize `plugin.geradoDoCommit`.
4. Rode os self-tests e `node scripts/setup/doctor.mjs`.
5. Commit + push. Na próxima sessão, o hook de cada usuário detecta a versão diferente e o `ps-setup` atualiza o `vendor/` sozinho.

## Gerar o pacote do plugin (`.ccx`)

Precisa do **UXP Developer Tool** (Creative Cloud › Apps).

1. `node scripts/setup/install.mjs vendor` (garante `vendor/adb-mcp` no commit do lock).
2. UXP Developer Tool › **Add Plugin** › selecione `vendor/adb-mcp/uxp/ps/manifest.json`.
3. No plugin, menu **•••** › **Package** → salve como `setup/plugin/photoshop-mcp-agent.ccx`.
4. Teste: `node scripts/setup/install.mjs plugin` numa máquina sem o plugin carregado pelo UXP Developer Tool.
5. Atualize `plugin.geradoDoCommit` no lock e faça commit do `.ccx`.

## Validações pendentes no Photoshop

- `install.mjs plugin`: sintaxe `/install` do UnifiedPluginInstallerAgent no Windows.
- `.mcp.json`: `uv run --directory vendor/adb-mcp/mcp --no-sync` com o ambiente criado por `uv sync --no-install-project`.
- Painel do plugin carregado na abertura do Photoshop com **Connect on Launch** marcado (se o painel não abrir sozinho, a conexão não acontece).
- Receitas em `scripts/recipes/` (`validated: false`).
