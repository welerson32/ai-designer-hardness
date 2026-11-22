import assert from 'node:assert';
import { loteExportacao, nomeArquivo } from './exportar.mjs';
import { planejar } from './pecas.mjs';
import { compileLote } from './recipe.mjs';

const tabela = {
  'instagram-feed-retrato': { W: 1080, H: 1350, margem: 60 },
  'instagram-story': { W: 1080, H: 1920, margem: 60 },
};
const [post, story] = planejar({ posts: [{ tipo: 'carrossel', paginas: 3, stories: 'feed' }] }, tabela);
const saida = 'C:/Docs/AI Designer/2026-11-21-promo';

const lote = loteExportacao({ saida, doc: 101, peca: post, tipo: 'png' });
assert.strictEqual(lote.name, '90-exportar-post-01');
assert.strictEqual(lote.steps.length, 3 * 5 + 1);
const folha2 = lote.steps.slice(5, 10);
assert.deepStrictEqual(folha2.map((s) => s.recipe ?? s.tool), ['select-document', 'duplicate-document', 'crop-document', 'save_document_as', 'close-document']);
assert.deepStrictEqual(folha2[0].params, { docId: 101 });
assert.deepStrictEqual(folha2[2].params, { left: 1180, top: 0, right: 2260, bottom: 1350 });
assert.match(folha2[3].args.file_path, /post-01-folha-02\.png$/);
assert.strictEqual(folha2[3].args.file_type, 'PNG');
assert.strictEqual(folha2[4].params.name, 'claude-export-post-01-02');
assert.strictEqual(lote.steps.at(-1).recipe, 'select-document');

const calls = compileLote(lote);
assert.deepStrictEqual(calls[0].commands.map((c) => c._obj), ['make', 'select', 'duplicate', 'crop']);
assert.strictEqual(calls[1].name, 'save_document_as');

const ls = loteExportacao({ saida, doc: 202, peca: story });
assert.match(ls.steps[3].args.file_path, /story-01-tela-01\.jpg$/);
assert.match(ls.steps[13].args.file_path, /story-01-tela-03\.jpg$/);
assert.deepStrictEqual(ls.steps[2].params, { left: 0, top: 0, right: 1080, bottom: 1920 });

const [unico] = planejar({ posts: [{ tipo: 'unico', stories: 'capa', cta: 'Saiba mais' }] }, tabela);
assert.strictEqual(nomeArquivo(unico, unico.pranchetas[0], 'jpg'), 'post-01.jpg');

assert.throws(() => loteExportacao({ saida, doc: 1, peca: post, tipo: 'gif' }), /jpg ou png/);
assert.throws(() => loteExportacao({ saida, peca: post }), /--doc/);

console.log('exportar: ok');
