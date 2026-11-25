# Diagnóstico 2026-11-24 (parcial: Photoshop fechado)

## Resumo
- BLOQUEIA: `scripts/setup/install.mjs` linha 52 tem quebra de linha literal dentro da string `'{"name":"memoria-deps","private":true}\n'` (SyntaxError) -> nenhum passo do instalador roda (inclusive `tudo`).
- Consequência: `vendor/memoria` sem `@huggingface/transformers`; `memoria.mjs aquecer` falha; memória vetorial indisponível (importar: fontes 0, vetores false). Selftest da memória passa (não usa o modelo real).
- Photoshop fechado: seções 0.5/0.6 (parcial), 1, 2, 3 PULADAS.

## 0 Ambiente
- Harness: efdbfe2. `claude --version`: PULADO (não está no PATH do bash).
- doctor: tudo OK exceto memoria [auto], photoshop-aberto, plugin-conectado.
- Self-tests scripts (cliente, exportar, geo, memoria, pauta, pecas, preview, recipe): OK. Hooks (aprendizado, batchplay-guard, session-handoff): OK.
- /mcp conectados: PULADO (checar manualmente). Modelo Sonnet 5.5: OK (declarado no contexto). Teste /model opus: PULADO (precisa do mantenedor).
- Hook SessionStart injetou contexto (handoff + doctor): OK.

## 0.1 Atualização e memória
- atualizar.mjs: OK em-dia, branch main.
- metodo.md: não existe. clientes/*/dossie.md: nenhum.
- sessoes.json: 1 vínculo (619f6c10... -> 2026-11-19-teste-ola). Esta sessão (c211981b) sem pauta.
- hook aprendizado: OK imprime o lembrete.
- memoria importar: fontes 0, novos 0, vetores false. aquecer: FALHA "Cannot find module '@huggingface/transformers'". workspace/memoria não existe.
- buscas reais / session-handoff --sessao / tempo do hook: PULADO (sem memória vetorial/dados).

## 4 Custo
- PULADO.

## 5 Insumo: aplicar lote por script
- Python: python-socketio (sem versão fixada em requirements.txt; resolver pelo uv.lock). Proxy: socket.io 4.8.1 (node, porta 3001, maxHttpBufferSize 50MB, transports websocket+polling). Cliente python usa só transport websocket.
- URL: http://localhost:3001. application = "photoshop".
- Fluxo (socket_client.send_message_blocking): conecta -> emit `command_packet` {type:"command", application:"photoshop", command:{application, action, options}} -> proxy repassa `command_packet` {senderId, application, command} aos clientes registrados (plugin) -> plugin responde `command_packet_response` {packet:{senderId, status:"SUCCESS"|"FAILURE", response, message?, ...}} -> proxy emite `packet_response` ao senderId -> cliente python desconecta.
- Casamento resposta/pedido: pelo socket id (senderId); cada chamada abre uma conexão nova (1 pedido por conexão). Sem id de pedido.
- Timeout: PROXY_TIMEOUT = 20 s (ps-mcp.py e ps-batch-play.py), via queue.get(timeout). FAILURE -> AppError "Error returned from photoshop: <message>".
- Payload tool de alto nível: action "createSingleLineTextLayer", options {layerName, contents, fontSize, opacity, position{x,y}, fontName, textColor{red,green,blue}, blendMode}.
- Payload batchPlay: action "executeBatchPlayCommand", options {commands:[descriptors]}.
- Resposta de sucesso: {senderId, status:"SUCCESS", response:<resultado>, document:<info do doc ativo>, layers:<árvore completa de camadas>, hasActiveSelection}. FAILURE: {senderId, status:"FAILURE", message:"Error calling <action> : <erro>"}. Toda resposta carrega getLayers() inteiro (peso cresce com o doc). Checar ao vivo com Photoshop aberto.
- Implicação: script Node pode usar socket.io-client (já em adb-proxy-socket/node_modules) com a mesma sequência; timeout de 20s é por comando, lote grande precisa timeout maior.

---
# ATUALIZAÇÃO 2026-11-25 (Photoshop 2027 aberto, UI pt-BR)
Correções: install.mjs consertado e enviado (3c328d6); memória instalada (doctor sem pendências, selftest com modelo real OK). Clientes (cliente-A, cliente-B, cliente-C; clientes.zip) copiados para workspace/clientes; importar: 8 itens (cliente-A 4, cliente-B 3, cliente-C 1), vetores true.

## Resumo (o que bloqueia / falha)
- create_document: ERRO "Cannot set properties of null (setting 'allLocked')" mas cria o doc (tamanho certo, nome NÃO aplicado, vira "Sem Título-1"; fundo "Plano de Fundo").
- create-artboard: FALHA parcial — ignora `name` (vira "Prancheta 1"; renomear depois com rename-layer) e ENGLOBA o fundo (vira "Camada 0" solidColor dentro da prancheta). Prancheta nasce com o rect certo.
- resize-artboard (changeSizes=1): 1350→2378 de altura (esperado 1920), canvas também 2378. changeSizes=2 não muda nada. Descriptor errado; reinvestigar (gravar ação real no Alchemist).
- crop-document: no-op em doc com prancheta (exportar.mjs depende dele; funcionou só porque a prancheta = canvas inteiro). Para pranchetas lado a lado o recorte NÃO vai funcionar sem validar.
- create-group: cria grupo VAZIO (não envolve a camada selecionada).
- add-guide: executado sem erro, NÃO verificado (get "guides" retorna "comando Obter não disponível"). Pendente: mantenedor conferir se há guia vertical em 540.
- Erro dentro do batchPlay vem com status SUCCESS (ex.: {"_obj":"error","message":...,"result":-25920} em `response`). Precisa checar `_obj:"error"` no corpo.
- Toda resposta de qualquer tool carrega `layers` (árvore) + `document`; save_document_as não atualiza name/path/saved do doc ativo (continua "Sem Título-1", path "", saved:false) — PSD foi gravado.

## 0 Ambiente (parcial)
- /mcp, /model opus, Hook injeção: não checados nesta rodada.

## 1 Leitura
- get_documents sem doc aberto: erro "Requires an open Photoshop document" (esperado).
- Pauta dev-teste = slug 2026-11-25-dev-teste (nome ganha prefixo de data; `pauta.mjs saida dev-teste` falha, usar o slug completo). pecas plano OK: post-01 (1080x1350) e story-01 (1080x1920).

## 2 Receitas (validated:true marcado nas OK)
OK: history-snapshot, revert-snapshot (voltou ao estado inicial), active-layers (ids de layer, não de prancheta-nome), layers-index (kind 7 group, 11 solidColor, 13 groupEnd; ~2.3KB p/ 3 camadas), layer-text (resposta ~10KB, pesada), rename-layer, set-opacity (50% = 128/255 no multiGet), set-visibility (hide/show verificados por multiGet visible), move-layer, duplicate-document (ativa a cópia, retorna documentID), select-document, delete-layer, close-document, resize-image (540x1189 confere).
translate_layer (tool) e move-layer: y positivo DESCE nos dois (top 242→342→442). Docstring do adb-mcp errada. Nota atualizada em .claude/policies/leitura-estado.md.
FALHA/pendente: create-artboard, resize-artboard, crop-document, create-group, add-guide (verificação). play-action: PULADO (sem Actions registradas).
save_document_as PSD (post-01.psd, 213KB) OK; exportar JPG 1080x1350 OK.

## 3 Fluxo real (parcial)
- exportar.mjs: gera lote de 6 passos; aplicado OK (post-01.jpg 1080x1350, cópia claude-export fechada, doc original reativo). Nota: padrão é JPG; memória do cliente-B diz PNG sempre (usar --tipo png).
- ps-scout: STATUS OK, ~16s, 4 tool uses; usou 1 multiGet do índice e filtrou local; hook não barrou nada; não gravou estado.json (peça não informada).
- ps-art-director: STATUS OK ~30s; preview 640x800, cópia claude-preview fechada, original ativo; hook não barrou nada. Veredito "ajustar" (doc em branco).
- NÃO feitos: etapa layout com geo.mjs/ps-plan, lote quebrado com rollback, story completo (story-01.psd) a partir do post.

## 4 Custo
- Sessão (13.8 min, 10 msgs): sonnet-5-5 70 req, in 140, cache write 126.4k, cache read 7953.2k, out 24.8k; haiku-5-5 3 req. Agentes: scout 1, art-director 1. Ferramentas: 31 Bash, 28 batch_play, 6 get_documents, 5 get_layer_bounds.
- /context: não coletado (só no terminal). Telas de aprovação: não contadas.

## 0.1 Memória/buscas (rodada 2, com clientes)
- Importados 8: cliente-A m-0001..4, cliente-B m-0005..7, cliente-C m-0008. TODOS marcados "sempre" pelo importador (inclusive itens de contexto/cadastro) → avaliar se isso está certo.
- Buscas ("como adapto o carrossel para story", "onde vai o logo", "qual cor usar no titulo") --cliente x: scores só 0.60-0.66 e com só 3-4 itens por cliente a ordem pouco discrimina; o 1º resultado nem sempre é o relevante (ex.: "adapto carrossel para story" no cliente-A trouxe m-0004 (carrossel+story) em 1º, certo; "onde vai o logo" sem resposta real: nada sobre logo). Não há aprendizado de logo — consulta devia retornar vazio/baixa confiança; hoje sempre devolve top-3 sem corte de score.

## 6 Fechamento
- pauta 2026-11-25-dev-teste: concluida. Doc de teste "Sem Título-1" (id 60) deixado aberto, não salvo, no Photoshop. Arquivos de teste em Documents\AI Designer\2026-11-25-dev-teste (post-01.psd/.jpg).
