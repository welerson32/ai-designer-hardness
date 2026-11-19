import assert from 'node:assert';
import { buildPreview } from './preview.mjs';

const objs = (call) => call.commands.map((c) => c._obj);

const region = buildPreview({ W: 4000, H: 5000, bounds: '100,200,2100,1200' });
assert.deepStrictEqual(region.size, { width: 800, height: 400 });
assert.deepStrictEqual(objs(region.calls[0]), ['duplicate', 'crop', 'imageSize']);
assert.strictEqual(region.calls[1].name, 'get_document_image');
assert.deepStrictEqual(objs(region.calls[2]), ['close']);
assert.strictEqual(region.calls[2].commands[0]._target[0]._name, 'claude-preview');

const small = buildPreview({ W: 600, H: 400 });
assert.deepStrictEqual(objs(small.calls[0]), ['duplicate']);

const clamped = buildPreview({ W: 1000, H: 1000, bounds: '-50,-50,500,500' });
assert.strictEqual(clamped.calls[0].commands[1].to.left._value, 0);

assert.throws(() => buildPreview({ W: 100, H: 100, bounds: '200,200,300,300' }), /fora do canvas/);

console.log('preview: ok');
