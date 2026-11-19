import assert from 'node:assert';
import { loteExportacao } from './exportar.mjs';
import { compileLote } from './recipe.mjs';

const base = { slug: '2026-11-19-promo', saida: 'C:/Docs/AI Designer/2026-11-19-promo', doc: 101, W: 1080, H: 1350 };

const lote = loteExportacao({ ...base, folhas: 3, tipo: 'png' });
assert.strictEqual(lote.steps.length, 3 * 5 + 1);
const folha2 = lote.steps.slice(5, 10);
assert.deepStrictEqual(folha2.map((s) => s.recipe ?? s.tool), ['select-document', 'duplicate-document', 'crop-document', 'save_document_as', 'close-document']);
assert.deepStrictEqual(folha2[0].params, { docId: 101 });
assert.deepStrictEqual(folha2[2].params, { left: 1080, top: 0, right: 2160, bottom: 1350 });
assert.match(folha2[3].args.file_path, /2026-11-19-promo-folha-02\.png$/);
assert.strictEqual(folha2[3].args.file_type, 'PNG');
assert.strictEqual(folha2[4].params.name, 'claude-export-02');
assert.strictEqual(lote.steps.at(-1).recipe, 'select-document');

const calls = compileLote(lote);
assert.deepStrictEqual(calls[0].commands.map((c) => c._obj), ['make', 'select', 'duplicate', 'crop']);
assert.strictEqual(calls[1].name, 'save_document_as');
assert.deepStrictEqual(calls[2].commands.map((c) => c._obj), ['close', 'select', 'duplicate', 'crop']);

assert.throws(() => loteExportacao({ ...base, folhas: 2, tipo: 'gif' }), /jpg ou png/);
assert.throws(() => loteExportacao({ ...base, doc: undefined, folhas: 2 }), /--doc/);

console.log('exportar: ok');
