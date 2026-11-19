import assert from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, compileLote } from './recipe.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'recipes');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const r = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const key of ['description', 'server', 'params', 'commands', 'validated']) {
    assert.ok(key in r, `${f}: falta "${key}"`);
  }
  const used = new Set([...JSON.stringify(r.commands).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]));
  assert.deepStrictEqual([...used].sort(), Object.keys(r.params).sort(), `${f}: params não batem com placeholders`);
}

const move = render('move-layer', { layerId: 12, dx: 40, dy: -8 });
assert.strictEqual(move[0]._target[0]._id, 12);
assert.strictEqual(move[1].to.horizontal._value, 40);
assert.strictEqual(move[1].to.vertical._value, -8);

assert.strictEqual(render('rename-layer', { layerId: 3, name: 'titulo' })[0].to.name, 'titulo');
assert.throws(() => render('move-layer', { layerId: 1 }), /dx/);
assert.throws(() => render('nao-existe'), /não encontrada/);

const calls = compileLote({
  name: '01-teste',
  steps: [
    { recipe: 'rename-layer', params: { layerId: 3, name: 'a' } },
    { recipe: 'set-visibility', params: { layerId: 3, action: 'hide' } },
    { tool: 'create_single_line_text_layer', args: { text: 'oi' } },
    { recipe: 'play-action', params: { set: 'Harness', action: 'web-export' } },
  ],
});
assert.strictEqual(calls.length, 3);
assert.strictEqual(calls[0].type, 'batchPlay');
assert.strictEqual(calls[0].commands[0]._obj, 'make');
assert.strictEqual(calls[0].commands[0].name, 'lote:01-teste');
assert.strictEqual(calls[0].commands.length, 3);
assert.strictEqual(calls[1].type, 'tool');
assert.strictEqual(calls[2].commands[0]._obj, 'play');

assert.strictEqual(compileLote({ name: 'x', snapshot: false, steps: [] }).length, 0);
assert.throws(() => compileLote({ name: 'x', steps: [{}] }), /step 1/);

console.log('recipe: ok');
