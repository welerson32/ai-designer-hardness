# Setup do adb-mcp

Referência: https://github.com/mikechambers/adb-mcp

1. Clonar o adb-mcp e definir a variável de ambiente `ADB_MCP_DIR` com o caminho do clone (usada pelo `.mcp.json`).
2. Instalar e carregar o plugin UXP do Photoshop (`uxp/ps`, via UXP Developer Tool).
3. Subir o proxy local: `cd $ADB_MCP_DIR/adb-proxy-socket && npm install && node proxy.js` (porta 3001).
4. No plugin, clicar em **Connect**.
5. No Claude Code, `/mcp` deve listar `photoshop` e `photoshop-bp`.
6. Self-tests: `node .claude/hooks/<batchplay-guard|session-handoff>.selftest.cjs` e `node scripts/<geo|recipe|preview>.selftest.mjs`.
7. Ao aprovar `get_document_image` e tools generativas, **não** escolha "sempre permitir" — o pedido de aprovação é o controle de custo.
