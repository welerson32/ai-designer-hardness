# AI Designer

Um parceiro de design dentro do Photoshop. Você conversa com o Claude como conversaria com outro designer, e ele monta, alinha e ajusta a arte direto no seu arquivo.

## Antes da primeira vez

Você precisa do **Photoshop 2025** ou mais novo e do **Claude Code**. Abra o Claude Code nesta pasta e diga "oi": ele confere o que falta, instala sozinho o que conseguir e te guia, passo a passo, no que precisa do seu clique (como ativar o plugin no Photoshop). Isso se repete a cada conversa — se algo quebrar, ele mesmo conserta ou te avisa.

## Como trabalhar

1. Abra o Photoshop.
2. Abra o Claude Code nesta pasta (ele confere a conexão sozinho).
3. Diga o que precisa. Cada demanda vira uma **pauta** — o Claude pergunta o nome e o cliente e guarda as anotações dela.
4. **Uma pauta por conversa.** Terminou ou vai trocar de peça? Abra uma conversa nova. O Claude te lembra.
5. Seus arquivos (PSD e exportações) ficam em **Documentos › AI Designer › <pauta>**.

## Bom saber

- O Claude não "olha" a arte o tempo todo: ele trabalha pelas medidas e pergunta para você quando algo é visual. Se quiser uma avaliação estética, peça — ele tira uma foto reduzida da área e comenta.
- Antes de cada alteração na arte, ele avisa o que vai fazer e pede sua aprovação. Antes de cada etapa, guarda um instantâneo no histórico para dar para voltar.
- Recursos de IA da Adobe (preenchimento generativo, gerar imagem) gastam créditos da sua conta — ele sempre avisa antes.

## Atualizar

Na pasta do projeto: `git pull`. Suas pautas e clientes ficam na pasta `workspace/`, que não é afetada pela atualização.
