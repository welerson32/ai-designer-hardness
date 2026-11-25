# Benchmark: Post 04 (carrossel 6 folhas, cliente-C) — PARCIAL

Escopo pedido: pauta "O que tem na bolsa de uma dermatologista" (capa flat lay + 5 itens recortados com sombra), 4 peças (post-01 + story feed inteiro; post-02 + story só capa/CTA). Fotos geradas pelo mantenedor no GPT (5 imagens; faltou o hidratante de mãos isolado).
Resultado: **parou no meio do post-01**. Motivo no item "Bloqueios".

## Tempo (relógio da máquina)
- Montagem (início da 1ª chamada ao Photoshop até a parada): 4,2 min, 39 requisições do modelo.
- Cada chamada ao Photoshop leva ~1–3 s; o tempo é dominado pelo número de chamadas (modelo), não pelo Photoshop.
- Pauta aberta -> imagens recebidas: depende do GPT/mantenedor (fora da conta).

## Custo (tokens; sem preço: a tabela de preços do Sonnet 5.5 não está no projeto)
Fase de montagem (delta de `scripts/dev/uso.mjs`):
- 39 requisições Sonnet | cache read ~9,49M tokens | cache write ~92k | output ~23,5k | input direto ~96.
- ~243k tokens lidos do cache por requisição (contexto da sessão). **O custo é quase todo releitura de contexto**; cada chamada extra custa ~243k de cache read, mesmo sendo trivial.
- Sessão inteira até aqui: 128 req Sonnet, 20,8M cache read, 257k cache write, 63k output; Haiku (scout) 3 req.
- Crédito Firefly: 0 (nenhuma ferramenta generativa). Remoção de fundo usa a do Photoshop (sem crédito generativo informado).

## Performance (o que funcionou / custou chamadas)
- 6 pranchetas + fundo em cada: 4 chamadas (delete falhou 1x; fundo do `create-artboard` virou "Camada 0" gigante e foi descartado; solução: pranchetas + retângulo-fundo por prancheta).
- Cada item recortado: move prancheta ao topo -> criar camada -> place_image -> remove_background -> sombra = 5 chamadas por item. place_image "falha" sempre (`rasterizeLayer : Could not find layerId`), mas o objeto inteligente é criado (id = camada+1). `remove_background` funciona (máscara criada, `hasUserMask: true`).
- Capa: texto + assinatura com centralização por `geo.mjs` e lote: bounds finais == `expect` (169,163,911,333 e 438,1272,642,1288).
- Respostas do Photoshop trazem a árvore inteira de camadas em TODA chamada: cresce com o documento e entra no contexto (principal motor de custo).

## Bloqueios / achados (para o mantenedor)
1. **Fonte Altone não está instalada** nesta máquina: o Photoshop trocou por MyriadPro (a resposta da ferramenta mostra `fontName: MyriadPro-Regular`). Nenhum erro é emitido.
2. **Texto/camada nova cai na prancheta errada.** As ferramentas `create_pixel_layer`, `create_*_text_layer` criam a camada relativa à camada ativa do documento, não à prancheta pedida; `select` via batchPlay não muda isso. Contornei com `move_layer TOP` na prancheta antes de criar (funciona para pixel layer; para texto saiu em 3 lugares diferentes: dentro da folha-03, na raiz e na folha-02). Sem corrigir isso, montar pranchetas com várias camadas de texto não é confiável. É o motivo da parada.
3. `place_image` só funciona em camada de pixel existente e sempre devolve erro após colocar.
4. `create_document`: erro `allLocked` nulo, cria mesmo assim sem o nome.
5. `create-artboard` ignora `name`; engloba a camada de fundo selecionada.
6. `resize-artboard` (story 1920): resultou em 2378 de altura. `crop-document` não faz nada com prancheta. Ambos bloqueiam o story (e o `exportar.mjs`) para pranchetas.
7. Erro dentro do batchPlay vem com `status: SUCCESS` (checar `_obj:"error"` no corpo).
8. Fechar o último documento aberto devolve erro, mesmo fechando.
9. Falta o isolado do hidratante de mãos (folha-05); a capa o traz, mas recortar do flat lay não foi feito.

## Estimativa para concluir (extrapolação, não medido)
- Post-01 completo: ~35–40 chamadas de ferramenta adicionais (textos das folhas 2–6, ajustes, salvar) ≈ +10 min e +12M cache read, se o item 2 estiver resolvido.
- Story-01 (6 telas), post-02 (cópia do post-01) e story-02 (1 tela + CTA): dependem dos itens 6; sem resolvê-los, a montagem do story não fecha.
