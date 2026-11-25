# Manutenção do harness

Para quem mantém o projeto (não para o designer).

## Atualizar a versão do adb-mcp

1. Escolha o commit novo do `mikechambers/adb-mcp` e teste localmente.
2. Atualize `commit` em `setup/adb-mcp.lock.json`.
3. Se o plugin mudou (`uxp/ps/`), gere o pacote novo (abaixo) e faça commit em `setup/plugin/`.
4. Rode os self-tests e `node scripts/setup/doctor.mjs`.
5. Commit + push. Na próxima sessão, o hook de cada usuário detecta a versão diferente e o `ps-setup` atualiza o `vendor/` sozinho.

## Pacote do plugin (`.ccx`)

O Creative Cloud só aceita pacote gerado pelo **UXP Developer Tool** (zip comum é recusado — testado em 2026-11-19).

- **Recomendado:** o mantenedor gera uma vez e faz commit em `setup/plugin/photoshop-mcp-agent.ccx`. Assim nenhum usuário precisa do UXP Developer Tool.
  1. `node scripts/setup/install.mjs vendor`.
  2. UXP Developer Tool › **Add Plugin** › `vendor/adb-mcp/uxp/ps/manifest.json`.
  3. **•••** › **Package** › salvar em `setup/plugin/photoshop-mcp-agent.ccx`.
  4. Testar o duplo clique numa máquina limpa e fazer commit.
- **Sem pacote do mantenedor:** o `ps-setup` guia cada usuário a gerar o próprio pacote (instalar o UXP Developer Tool, Add Plugin, Package) em `vendor/plugin/` (ignorado pelo git).

## Validações pendentes no Photoshop

- `install.mjs plugin`: sintaxe `/install` do UnifiedPluginInstallerAgent com o `.ccx` do UXP Developer Tool.
- `.mcp.json`: `uv run --directory vendor/adb-mcp/mcp --no-sync` com o ambiente criado por `uv sync --no-install-project`.
- Painel do plugin carregado na abertura do Photoshop com **Connect on Launch** marcado (se o painel não abrir sozinho, a conexão não acontece).
- Receitas em `scripts/recipes/` (`validated: false`).

## Modo desenvolvedor

- `/dev-diagnostico` — diagnóstico ponta a ponta numa máquina com Photoshop (ambiente, trava de modelo, todas as receitas, fluxo de uma peça, custo). Não é acionado pelo Claude sozinho; gera `workspace/dev/diagnostico-<data>.md`.
- `node scripts/dev/uso.mjs [--sessao <id>]` — tokens por modelo (sessão + subagentes), agentes, ferramentas e duração da sessão.
