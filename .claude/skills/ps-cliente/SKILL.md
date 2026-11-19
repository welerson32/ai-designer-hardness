---
name: ps-cliente
description: Cadastra um cliente novo (monta o dossiê de identidade a partir do que o designer passa e do estudo de um arquivo guia) ou atualiza o dossiê de um cliente existente com aprendizados. Use quando o designer apresentar um cliente, quando uma pauta citar cliente sem dossiê pronto, ou quando surgir uma preferência nova do cliente.
---

# Clientes

Pasta: `workspace/clientes/<slug>/` → `cliente.json` (status), `dossie.md` (o que as pautas leem), `identidade.json` (números para scripts), `referencias/` (arquivo guia), `assets/` (logos, fontes, elementos).

**Quem escreve o dossiê é você**, no modelo `templates/dossie.md`. O designer só fornece a matéria-prima. Cadastro é trabalho grande: faça em sessão própria, sem pauta vinculada.

## Cadastro

1. `node scripts/cliente.mjs nova --nome "<nome>"`.
2. **Colete — nunca presuma.** Peça ao designer, em linguagem de design:
   - o que ele sabe do cliente (estilo, público, cores, fontes, o que agrada e o que não agrada);
   - um **arquivo guia**: uma peça pronta (PSD, PDF ou imagem) e, se houver, o manual de marca;
   - **logo e fontes:** que mande os arquivos ou diga onde estão no computador.
   Rode `node scripts/cliente.mjs checar <slug>` e trate `faltando` como a lista do que pedir. Pasta `assets/` ou `referencias/` vazia = pedir, não supor.
3. **Registre os caminhos** em `identidade.json` (`assets.logo`, `assets.fontes`, `assets.outros`, `guia`): relativo à pasta do cliente se o arquivo foi colocado lá; absoluto se o designer apontou onde está.
4. **Estude o arquivo guia:**
   - **PSD:** abra com `open_photoshop_file`; acione o `ps-scout` pedindo `doc`, o índice filtrado por tipo `text` e, para até ~15 camadas de texto, a receita `layer-text` (fonte, tamanho, cor, entrelinha). Margens = menores distâncias dos elementos às bordas (`geo.mjs` se precisar). Feche o guia sem salvar (receita `close-document` pelo nome do documento).
   - **PDF ou imagem:** leitura visual **única**, só no cadastro (ler o arquivo direto). Extraia paleta, hierarquia tipográfica, composição e estilo de imagem. Fontes não são identificáveis com certeza pela imagem → confirmar com o designer.
5. **Sintetize** `dossie.md` (máx. ~8.000 caracteres) e `identidade.json` (hex, nomes exatos de fonte — `fontPostScriptName` quando vier do PSD —, margens por formato).
6. **Lacunas:** `checar` de novo; transforme `pendencias` em **poucas perguntas de uma vez**. Mostre ao designer um resumo do dossiê em linguagem de design e peça confirmação.
7. Confirmado e sem lacunas → `node scripts/cliente.mjs concluir <slug>`. Lembre: "Cliente cadastrado. Para a primeira pauta dele, abra uma conversa nova."

## Aprendizados (durante pautas)

Preferência nova do cliente ("não gosta de fundo escuro", "logo sempre no canto inferior") → pergunte se vale para todas as pautas do cliente. Se sim, acrescente em **9. Aprendizados** (`AAAA-MM-DD <pauta>: <aprendizado>`) e ajuste a seção afetada. Mantenha o dossiê dentro do limite: consolide em vez de só acumular.

## Regras

- Pauta só começa com cliente `pronto`. Cliente `inexistente` ou `em-cadastro` → ofereça o cadastro (sessão própria) antes.
- O dossiê é o **único** arquivo do cliente lido nas pautas. Arquivo guia e referências não são relidos depois do cadastro.
