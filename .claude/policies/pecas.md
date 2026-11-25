# Peças e entrega

## Modelo (regra fixa)

- **Uma pauta tem várias peças.** O designer diz no início quantos posts e de que tipo (post único ou carrossel com N folhas).
- **Todo post tem story.** Post e story são **peças separadas**.
- **Um PSD por peça.** 6 posts + 6 stories = 12 PSDs (`post-01.psd`, `story-01.psd`…), na pasta de saída da pauta.
- **Uma prancheta (Artboard de verdade) por página**, lado a lado no PSD da peça:
  - post único → 1 prancheta (`folha-01`);
  - carrossel de N folhas → N pranchetas (`folha-01` … `folha-NN`). **Nunca** o carrossel inteiro numa prancheta só;
  - story → uma prancheta por tela (`tela-01` …), 1080x1920.

## Stories — confirmar o cenário com o designer, post a post

1. **Feed inteiro** (`feed`): o story repete todas as páginas do post, idênticas, só no tamanho de story. Carrossel de 5 folhas → story com 5 telas.
2. **Só a capa** (`capa`): o story tem 1 tela com a capa (folha 1) no tamanho de story **+ o CTA** que o designer passar. Sem o CTA, a peça não fecha — pergunte.

Nunca presuma o cenário: pergunte para cada post (ou "todos iguais?").

## Abertura da pauta (antes de abrir o Photoshop)

1. Colete: quantidade e tipo de cada post, nº de folhas, formato, cenário do story de cada post (e CTA, se `capa`), **textos literais** página por página, características esperadas.
2. Grave o pedido em `<pauta>/pedido-pecas.json` e rode `node scripts/pecas.mjs plano <slug> --pedido <pauta>/pedido-pecas.json` — gera a lista de peças com tamanhos, pranchetas e frames no `pauta.json`.
3. Mostre ao designer a lista em linguagem de design ("3 posts: 1 carrossel de 5 folhas e 2 posts únicos; stories: …") e confirme.
4. Textos: **copiados literalmente** no Briefing do handoff, por peça e página. Nunca reescreva, resuma ou corrija sem pedido.

Andamento por peça: `node scripts/pecas.mjs status <slug> <peca> pendente|montando|aprovada|exportada`. CTA que chegar depois: `node scripts/pecas.mjs cta <slug> <story-NN> --texto "..."`.

## Montagem de um post

Dados da peça: `node scripts/pecas.mjs ver <slug> <post-NN>` (canvas, `frame` e `conteudo` de cada prancheta).

1. tool `create_document` com o tamanho de **uma página** (`W`×`H`);
2. receita `create-artboard` para cada prancheta (`nome`, `frame`);
3. scout registra no `estado.json` a peça, o `doc.id` e o ID de cada prancheta;
4. salvar já como `<saida>/<post-NN>.psd`.

- Posicionar dentro de uma página: `center`/`align` com `--frame` da prancheta (nunca o canvas todo).
- Texto e elemento importante dentro da área `conteudo`.
- Elemento que atravessa folhas (continuidade do carrossel) → uma cópia em cada prancheta, recortada pela própria prancheta.

## Montagem de um story (depois do post aprovado)

O story nasce **do post aprovado**, nunca do zero:

1. selecione o PSD do post → receita `duplicate-document` (nome `story-NN`);
2. cenário `capa` → receita `delete-layer` nas pranchetas `folha-02` … `folha-NN`;
3. receita `resize-artboard` em cada prancheta para o `frame` da tela correspondente (`pecas.mjs ver <slug> <story-NN>`) e `rename-layer` de `folha-NN` para `tela-NN`;
4. **adaptação do conteúdo ao formato story → método do designer** (ver abaixo);
5. cenário `capa` → aplicar o CTA (texto literal);
6. salvar como `<saida>/<story-NN>.psd`. O PSD do post nunca é alterado.

## Método do designer (aprendido, não presumido)

Como adaptar a arte ao story (fundo, reposição do conteúdo, zona segura) e outros "jeitos de fazer" **são ensinados pelo designer**:

- Antes de adaptar: `node scripts/memoria.mjs buscar "adaptar <post> para story: fundo, conteúdo, zona segura" --cliente <slug>`.
- Não achou → pergunte ao designer como ele faz. Não invente.
- Ensinou → `memoria.mjs registrar` na hora (`--escopo cliente:<slug>` se vale só para o cliente; `execucao` se é o jeito dele em geral), com a fala literal. Confirme numa linha: "Anotado, faço assim daqui pra frente."
- Nunca pergunte de novo o que já está registrado.

## Entrega

- PSD de cada peça na pasta de saída da pauta (`save_document_as`, tipo `PSD`).
- **Uma imagem por prancheta:** `node scripts/exportar.mjs <slug> <peca> --doc <doc.id> [--tipo jpg|png]` → lote em `<pauta>/etapas/90-exportar-<peca>.json`, aplicado conforme a skill `ps-plan`. Nomes: `post-01.jpg` (página única), `post-01-folha-02.jpg`, `story-01-tela-03.jpg`. O PSD não é alterado.
- Formato padrão `jpg`; `png` se o designer pedir.
- Ao terminar cada peça: `status … exportada`. Ao terminar a pauta, diga onde estão: "Os 12 PSDs e as imagens estão em Documentos › AI Designer › <pasta>."
