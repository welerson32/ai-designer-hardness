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
- Tamanho da prancheta: `largura da folha × nº de folhas` por `altura da folha`. Calcule com `node scripts/geo.mjs carrossel --W <folha W> --H <folha H> --folhas <N> --margem <m>` → prancheta, `frame` e `conteudo` (área útil) de cada folha, posições das guias.
- **Guias verticais** nas divisões entre folhas.
- **Um grupo por folha:** `folha-01`, `folha-02`… Elementos que atravessam a divisão (continuidade entre folhas) ficam num grupo `continuo`.
- Posicionar dentro de uma folha: `center`/`align` com `--frame` da folha (não com o canvas inteiro).
- Texto e elemento importante **nunca em cima da divisão** entre folhas — respeitar a área `conteudo`.
- Salvar como `<slug-da-pauta>.psd` na pasta de saída da pauta.
