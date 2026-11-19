---
name: ps-visual-check
description: Regras para capturar e avaliar imagem do documento Photoshop. Use somente quando o critério de aceite depender de ver o resultado.
---

# Validação visual

Captura de imagem é a operação mais cara do harness (tokens de visão).

- **Antes:** a pergunta pode ser respondida por metadados? Se sim, não capture.
- **Resolução:** sempre a menor que permita julgar (ex.: lado maior ≤ 768px).
- **Escopo:** prefira a camada/região afetada ao documento inteiro.
- **Frequência:** uma captura ao final de um lote, não a cada operação.
- **Comparação antes/depois:** só quando pedida.
