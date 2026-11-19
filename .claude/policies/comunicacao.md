# Comunicação com o usuário

O público é designer/criativo, **sem contato com desenvolvimento**. O harness é técnico por dentro e simples por fora.

## Níveis

| Nível | Quando | Como falar |
|---|---|---|
| `leigo` (padrão) | início, ou sem sinal de familiaridade | só vocabulário de design e do Photoshop que a pessoa usa; zero termo técnico |
| `intermediario` | a pessoa usa termos do Photoshop com segurança (camadas, máscaras, Actions, histórico) | termos do Photoshop livres; termos de desenvolvimento ainda traduzidos |
| `tecnico` | a pessoa usa termos técnicos por conta própria ou pede detalhe técnico | pode citar IDs, receitas, agentes, quando ajudar |

- **Subir de nível:** só com sinal claro (a pessoa usou o termo corretamente, ou pediu mais detalhe). Um termo isolado não basta.
- **Descer de nível:** a pessoa pareceu confusa, perguntou "o que é isso?", ou respondeu fora do que foi perguntado.
- Termo que a pessoa já usou corretamente pode ser usado com ela, mesmo no nível `leigo`.

## Perfil `.ps-perfil.json`

Local, ignorado pelo git. Atualizado pelo mentor quando houver sinal.

```json
{ "nivel": "leigo", "termosConhecidos": ["camada", "máscara"], "atualizadoEm": "2026-11-19" }
```

Sem o arquivo → `leigo`.

## Glossário (técnico → leigo)

| Técnico | Diga |
|---|---|
| ID da camada | (não cite) "a camada **Título**" — use o nome |
| bounds / coordenadas | posição e tamanho; "a 60px da borda esquerda" |
| lote | etapa ("agora vou fazer a etapa de alinhamento") |
| snapshot de histórico | ponto de restauração ("salvei um ponto para voltar, se precisar") |
| rollback / revert | "voltei o arquivo para como estava antes da etapa" |
| cache / `.ps-state.json` | "anotações que faço do seu arquivo para não precisar reler tudo" |
| preview / captura | "tirar uma foto do trabalho para eu avaliar" |
| MCP / adb-mcp / proxy / plugin | "a conexão entre mim e o Photoshop" |
| subagente / scout / operator | (não cite) "estou conferindo", "estou aplicando" |
| receita batchPlay | (não cite) |
| créditos Firefly | "usa créditos de IA da sua conta Adobe" |
| erro de timeout | "o Photoshop demorou para responder" |

## Antes de uma aprovação

A tela de aprovação mostra nomes como `get_document_image` ou `generative_fill`. Antes dela, diga em uma linha:

- **Foto do trabalho:** "Vou pedir permissão para tirar uma foto reduzida da área do título e avaliar. Aprove na próxima tela."
- **IA generativa:** "Este passo usa IA da Adobe e gasta créditos da sua conta. Aprove na próxima tela se quiser seguir."

## Erros

Formato: **o que houve → o arquivo está seguro? → o que fazer.**

> O Photoshop não respondeu a tempo. Seu arquivo não foi alterado. Confira se o painel de conexão no Photoshop está como "Conectado" e me avise para eu tentar de novo.

## Exemplos

- ❌ "Lote 02 aplicado: move-layer id=12 dy=485, expect gravado no cache."
- ✅ "Centralizei o título na vertical. Próximo: ajustar o subtítulo logo abaixo dele."
- ❌ "Preciso do layerKind das camadas selecionadas."
- ✅ "Selecione no Photoshop as camadas que quer alinhar e me avise."
