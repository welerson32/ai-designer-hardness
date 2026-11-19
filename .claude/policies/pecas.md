# Peças e entrega

## Entrada da pauta

O designer recebe a pauta com **os textos do post** e **as características esperadas**. Tudo isso vai para o `handoff.md` da pauta, seção **Briefing**:

- **Textos: copiados literalmente**, folha por folha quando for carrossel. Nunca reescreva, resuma ou corrija sem pedido — divergência de texto é erro de entrega.
- **Características:** formato, número de folhas, tom, elementos obrigatórios, restrições.
- Faltou algo para começar (formato, nº de folhas, texto de alguma folha) → pergunte antes de abrir o Photoshop.

## Post único

Um PSD na pasta de saída da pauta, no formato definido (`templates/formatos.json` + dossiê do cliente).

## Carrossel — uma prancheta, um PSD (regra fixa)

- **Um único arquivo PSD** com **uma única prancheta**, com as folhas lado a lado. **Nunca** um arquivo por folha, nunca uma prancheta por folha.
- **Prancheta de verdade (Artboard)**, não um documento comum. Tamanho: `largura da folha × nº de folhas` por `altura da folha`. Calcule com `node scripts/geo.mjs carrossel --W <folha W> --H <folha H> --folhas <N> --margem <m>` → prancheta, `frame` e `conteudo` (área útil) de cada folha, posições das guias.
- **Montagem (primeiro lote da pauta):**
  1. tool `create_document` com o tamanho total da prancheta;
  2. receita `create-artboard` (nome `carrossel`, retângulo `0,0,<prancheta W>,<H>`);
  3. receita `add-guide` (vertical) em cada posição de `guias`;
  4. com a prancheta selecionada, receita `create-group` para `folha-01` … `folha-NN` (e `continuo`, se houver elemento atravessando folhas);
  5. scout registra no `estado.json` o `doc.id`, a prancheta e os grupos.
- **Um grupo por folha:** `folha-01`, `folha-02`… Elementos que atravessam a divisão ficam em `continuo`.
- Posicionar dentro de uma folha: `center`/`align` com `--frame` da folha (não com a prancheta inteira).
- Texto e elemento importante **nunca em cima da divisão** entre folhas — respeitar a área `conteudo`.

## Entrega

- **PSD:** `<slug-da-pauta>.psd` na pasta de saída da pauta (`save_document_as`, tipo `PSD`).
- **Carrossel — uma imagem por folha**, além do PSD:
  `node scripts/exportar.mjs --slug <slug> --saida <pasta de saída> --doc <doc.id> --W <folha W> --H <folha H> --folhas <N> [--tipo jpg|png] --arquivo <pauta>/etapas/90-exportar-folhas.json`
  e aplique o lote com o `ps-operator`. Para cada folha: seleciona o PSD → duplica → recorta a folha → salva `<slug>-folha-NN.<ext>` → fecha a cópia. O PSD original não é alterado.
- Formato padrão `jpg`; `png` se o designer pedir (transparência, máxima qualidade).
- Ao terminar, diga onde estão os arquivos: "PSD e as N imagens estão em Documentos › AI Designer › <pasta>."
