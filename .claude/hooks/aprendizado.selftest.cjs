const assert = require('node:assert');
const { detecta } = require('./aprendizado.cjs');

for (const p of [
  'já te falei que o logo fica embaixo',
  'você errou a fonte de novo',
  'não é assim, o título vai em caixa alta',
  'não use sombra nesse cliente',
  'sempre deixa 90px de margem',
  'lembra que ela não gosta de fundo escuro',
  'corrigi isso ontem',
]) assert.ok(detecta(p), `devia detectar: ${p}`);

for (const p of ['centraliza o título', 'pode exportar o post 2', 'abre a pauta da Acme', undefined]) {
  assert.ok(!detecta(p), `não devia detectar: ${p}`);
}

const { vaiBuscar } = require('./aprendizado.cjs');
for (const p of ['ok', 'pode seguir', 'exporta o post 2 em png', 'salva e fecha o arquivo agora']) assert.ok(!vaiBuscar(p), `não devia buscar: ${p}`);
for (const p of ['como eu adapto esse carrossel para o story?', 'monta a capa com o título grande e a foto do produto']) assert.ok(vaiBuscar(p), `devia buscar: ${p}`);

console.log('aprendizado: ok');
