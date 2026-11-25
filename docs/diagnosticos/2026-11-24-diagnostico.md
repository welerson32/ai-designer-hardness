# Diagnóstico 2026-11-24 — rodada 3 (Photoshop 2027 aberto, UI pt-BR)

## Resumo
- **Bloqueia o uso real:** nada novo. Pendentes que exigem o mantenedor: `resize-artboard` (nenhuma variação de `changeSizes` funciona: sem o campo, 0 e 3 = no-op ou erro de parâmetros) e `add-guide` (gravar Action → "Copiar como JavaScript"). Sem `resize-artboard`, a montagem de story (passo 3 da política) continua manual.
- **Bugs achados e corrigidos nesta rodada:** (1) `falsoErro` de `create_document` não casava (parênteses sem escape na regex) — o lote dava ERRO; corrigido em `scripts/acoes-ps.json`, confirmado em 2 criações. (2) `create-artboard` falhava com `selectNoLayers` (-25920); removido o passo, receita validada.
- **Receitas novas:** `select-layer` (validada), `deselect` (sem erro; seleção não conferida visualmente). Motivo: `clear_selection` do MCP/plugin falha ("Could not find layerId : undefined"); upstream também não manda layerId.
- **Fontes:** só Raleway instalada. Kurdis, Agnetta, Altone e TenorSans viram MyriadPro-Regular sem erro.
- **Custo:** ~12,5 min, sonnet-5-5 57 req (cache read 6,2M, out 28k), haiku 3 req.

## 0 / 0.1 Ambiente e memória
- claude --version: PULADO (fora do PATH do bash). /mcp, /model opus, /context, telas de aprovação: PULADO (precisam do mantenedor).
- doctor: só `memoria` [auto] falhava → `install.mjs memoria` resolveu (o install exige passo; sem argumento imprime uso). 13 self-tests OK. atualizar: em-dia.
- metodo.md: inexistente. Dossiês: 3 clientes, ~61/61/53 linhas. sessoes.json: 2 vínculos.
- importar idempotente: 8 fontes, 0 novos. aquecer OK. Hook aprendizado: lembrete OK; para "como adapto o post para story?" imprimiu 0 bytes (nada acima do corte). Hook 0,13 s. session-handoff --sessao: 12 linhas.
- Buscas (cos do item certo → 1º): story export cliente-B 0,827; overlay cliente-A 0,837; entrega carrossel cliente-A 0,834; qual fonte cliente-C 0,831; foto a sugerir cliente-B 0,837; "que fundo uso" cliente-B: certo (m-0006) 0,796, abaixo do corte.
- Sem resposta (maior cos): logo 0,785; tamanho CTA 0,777; cor do botão 0,799. Corte 0,815 separa bem, mas perde "que fundo uso" (0,796). Faixa útil de corte: 0,80–0,815; sugiro manter 0,815 (menos falso positivo) ou 0,80 com o risco do 0,799.

## 1 Leitura
- Sem doc aberto: get_documents/get_document_info → ERRO esperado "Requires an open Photoshop document" (118 caracteres). Com doc: get_document_info 257 caracteres, sem árvore de camadas.
- Pauta dev-teste = slug com prefixo de data. pecas plano OK (post-01, story-01; depois carrossel 3 folhas com gap de 100px: frames 0/1180/2360).

## 2 Aplicação por script
- create_document: ERRO allLocked (nome não aplicado, doc criado). Após o fix do regex: OK com `avisos`.
- create-artboard: nome OK, retângulo OK; **a 1ª prancheta engole o Plano de Fundo como "Camada 0"** → apagar com delete-layer (id 4 nos docs novos). As seguintes nascem na raiz. Lote único de 14 passos (doc + 3 pranchetas + 3 textos) rodou OK.
- group_layers: grupo contém as duas camadas, dentro da prancheta da folha-02.
- Erro no meio do lote: ERRO, `chamadas 2/4`, rollback feito, nomes voltaram.
- expect: certo → OK; errado → OK_COM_DIVERGENCIA com esperado/real.
- resize-artboard / add-guide: PULADO (precisa gravar Action). resize-artboard: 3 variações testadas, todas sem efeito (revertidas por snapshot).
- Exportação de carrossel (3 pranchetas lado a lado): 3 PNGs 1080x1350, conteúdo certo em cada (conferido nas folhas 2 e 3). crop-document validado após flatten. Fundo branco porque o Plano de Fundo foi apagado.
- play-action: PULADO (sem Actions).
- Camada na prancheta certa: `select-layer` na prancheta (id) + create_single_line_text_layer → texto nasce DENTRO dela. Caminho (a) funciona; `move-into-artboard` desnecessária.
- place_image: OK (camada criada, smart object kind 5); o erro `rasterizeLayer` não apareceu desta vez. Nome da camada ficou "2".
- layers-index: saída trunca em 4000 caracteres com ~9 camadas (vira string, não JSON) → quebra parse; o mesmo vale para layer-text.
- Fontes: pedidas 9, aplicadas 1 (Raleway). Ausentes: Kurdis-Regular, Kurdis-SemiBold, Agnetta, Altone-*, TenorSans.
- Fechar último doc: erro "Cannot read properties of null (reading 'name')" mesmo fechando. Receitas não suportam `falsoErro` (só tools).
- `clear_selection` (tool): ERRO sempre.

## 3 Fluxo real
- Etapa layout em 1 lote (11 chamadas): doc, prancheta, fundo (pixel+retângulo+preenchimento), título e subtítulo; expect do título OK. Subtítulo ficou a 33px do título em vez de 24 (posição prevista por métrica, não medida) → para precisão exige 2 passos (criar, medir, mover).
- ps-scout: OK, ~13 s, 3 usos; nome exato + tipo text numa chamada; guard não barrou.
- ps-art-director: OK, ~140 s; preview 640x800; cópia claude-preview fechada; doc original reativo; guard não barrou. Veredito "aprovado", subtítulo à esquerda (fora do critério).
- exportar post-01 (PNG): OK, 8 chamadas.
- Story: duplicate + rename tela-01 + salvar story-01.psd OK; **sem redimensionar** (resize-artboard quebrada), então o story ficou 1080x1350 de prancheta.

## 4 Custo
- uso.mjs: 12,45 min, 3 mensagens; sonnet 57 req/in 116/cache write 110k/cache read 6,2M/out 28k; haiku 3 req. Ferramentas: 45 Bash, 3 batch_play, 1 get_document_image, 2 Agent.

## 6 Fechamento
- Docs de teste fechados sem salvar (último com o erro conhecido). Pauta encerrada. Arquivos em Documentos\AI Designer\<pauta de teste>: post-01.png, post-02 (psd + 3 folhas), story-01.psd.
