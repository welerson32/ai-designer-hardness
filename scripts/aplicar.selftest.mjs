import assert from 'node:assert';
import { comandoDaTool, planejar, executarLote, erroDoPacote, enxugar } from './aplicar.mjs';

const c = comandoDaTool('translate_layer', { layer_id: 12, y_offset: 40 });
assert.deepEqual(c, { application: 'photoshop', action: 'translateLayer', options: { layerId: 12, xOffset: 0, yOffset: 40 } });
assert.equal(comandoDaTool('create_single_line_text_layer', { layer_name: 't', text: 'Oi', font_size: 48, postscript_font_name: 'Arial' }).options.textColor.red, 255);
assert.throws(() => comandoDaTool('generate_image', {}), /crédito/);
assert.throws(() => comandoDaTool('nao_existe', {}), /sem mapeamento/);
assert.throws(() => comandoDaTool('translate_layer', {}), /layer_id/);

const lote = {
  name: '02-teste',
  steps: [
    { recipe: 'move-layer', params: { layerId: 12, dx: 0, dy: 10 } },
    { recipe: 'rename-layer', params: { layerId: 12, name: 'titulo' } },
    { tool: 'translate_layer', args: { layer_id: 12, x_offset: 5 } },
  ],
  expect: [{ layerId: 12, bounds: { left: 95, top: 110, right: 995, bottom: 250 } }],
};
const { passos } = planejar(lote);
assert.ok(passos.length >= 4 && passos.every((p) => p.comando.action !== 'executeBatchPlayCommand' || p.comando.options.commands.length === 1), 'um comando por chamada');

const ARVORE = { layers: [{ id: 1, name: 'enorme' }] };
const ok = (response = {}) => ({ status: 'SUCCESS', response, document: { id: 7, name: 'post-01', width: 1080, height: 1350, layers: 'x' }, ...ARVORE });
const bounds = { boundsNoEffects: { left: { _unit: 'pixelsUnit', _value: 95 }, top: { _value: 110 }, right: { _value: 995 }, bottom: { _value: 250 } } };

let enviados = [];
let r = await executarLote(lote, async (cmd) => {
  enviados.push(cmd);
  return cmd.options?.commands?.[0]?._obj === 'get' ? ok(bounds) : ok();
});
assert.equal(r.status, 'OK');
assert.deepEqual(r.expect, [{ layerId: 12, ok: true }]);
assert.deepEqual(r.doc, { id: 7, name: 'post-01', width: 1080, height: 1350 });
assert.ok(!JSON.stringify(r).includes('enorme'), 'árvore de camadas nunca sai');

enviados = [];
r = await executarLote(lote, async (cmd) => {
  enviados.push(cmd);
  if (cmd.options?.commands?.[0]?._obj === 'set') return ok({ _obj: 'error', message: 'camada não existe', result: -25920 });
  return ok();
});
assert.equal(r.status, 'ERRO');
assert.match(r.falha.mensagem, /camada não existe/);
assert.equal(r.rollback, 'feito');
const ultimo = enviados[enviados.length - 1].options.commands[0];
assert.equal(ultimo._obj, 'select');
assert.equal(ultimo._target[0]._name, 'lote:02-teste');

r = await executarLote(lote, async (cmd) => (cmd.options?.commands?.[0]?._obj === 'get' ? ok({ boundsNoEffects: { left: 0, top: 0, right: 1, bottom: 1 } }) : ok()));
assert.equal(r.status, 'OK_COM_DIVERGENCIA');

r = await executarLote(lote, async () => { throw new Error('sem resposta em 20s'); });
assert.equal(r.status, 'ERRO');
assert.equal(r.rollback, 'não necessário');

assert.equal(erroDoPacote({ status: 'FAILURE', message: 'x' }), 'x');
assert.match(enxugar({ a: 'y'.repeat(5000) }), /caracteres\]$/);

r = await executarLote({ name: 'p', steps: [{ tool: 'place_image', args: { layer_id: 3, image_path: 'x.png' } }] }, async (cmd) => {
  assert.ok(!('falsoErro' in cmd), 'metadado não vai ao plugin');
  return cmd.action === 'placeImage' ? { status: 'FAILURE', message: 'Error calling placeImage : rasterizeLayer : Could not find layerId : 4' } : ok();
});
assert.equal(r.status, 'OK');
assert.equal(r.avisos.length, 1);

console.log('aplicar: ok');
