import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registrar, reforcar, nucleo, buscar, importar, carregar, tokens, LIB_DIR, embedderLocal } from './memoria.mjs';

const DIM = 64;
const fake = async (textos) => textos.map((t) => {
  const v = new Array(DIM).fill(0);
  for (const tk of tokens(t)) v[[...tk].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % DIM, 7)] += 1;
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
});

const root = mkdtempSync(join(tmpdir(), 'memoria-'));
try {
  const r1 = await registrar({ root, embed: fake, escopo: 'execucao', texto: 'Story: estender a cor de fundo em vez de esticar a foto', fala: 'nunca estica a foto no story' });
  assert.equal(r1.status, 'registrado');
  assert.equal(r1.item.id, 'm-0001');
  await registrar({ root, embed: fake, escopo: 'cliente:acme', texto: 'Logo sempre no canto inferior direito', termos: 'marca,assinatura', sempre: true });
  await registrar({ root, embed: fake, escopo: 'cliente:outro', texto: 'Fundo escuro com logo branco' });
  assert.equal((await registrar({ root, embed: fake, escopo: 'execucao', texto: 'story: estender a cor de fundo em vez de esticar a foto ' })).status, 'ja-existe');

  const dup = await registrar({ root, embed: fake, escopo: 'execucao', texto: 'Story: estender a cor do fundo em vez de esticar a foto' });
  assert.ok(dup.similares.some((s) => s.id === 'm-0001'), 'devia apontar parecido');

  let b = await buscar({ root, embed: fake, consulta: 'onde vai a marca?', cliente: 'acme' });
  assert.equal(b.modo, 'vetorial');
  assert.equal(b.itens[0].id, 'm-0002');
  assert.ok(!b.itens.some((i) => i.escopo === 'cliente:outro'), 'não mistura clientes');

  b = await buscar({ root, embed: fake, consulta: 'adaptar post para story', cliente: 'acme', excluirNucleo: true });
  assert.ok(!b.itens.some((i) => i.sempre));

  const sub = await registrar({ root, embed: fake, escopo: 'execucao', texto: 'Story: estender a cor de fundo e desfocar a foto atrás', substitui: 'm-0001' });
  const todos = carregar(root).itens;
  assert.equal(todos.find((i) => i.id === 'm-0001').ativo, false, 'substituído fica inativo');
  assert.equal(todos.find((i) => i.id === 'm-0001').texto.startsWith('Story'), true, 'texto antigo preservado');
  assert.equal(sub.item.substitui, 'm-0001');

  reforcar({ root, id: sub.item.id, pauta: 'p1' });
  const nuc = nucleo({ root, cliente: 'acme' }).map((i) => i.id);
  assert.deepEqual(nuc, [sub.item.id, 'm-0002']);
  assert.deepEqual(nucleo({ root }).map((i) => i.id), [sub.item.id]);

  const exc = await buscar({ root, embed: fake, consulta: 'logo fundo story', cliente: 'acme', excluir: ['m-0004'] });
  assert.ok(!exc.itens.some((i) => i.id === 'm-0004'), 'excluir funciona');
  for (let n = 0; n < 45; n++) await registrar({ root, embed: fake, escopo: 'execucao', texto: `regra sempre numero ${n} zz${n}`, sempre: true });
  const cheio = nucleo({ root });
  assert.equal(cheio.length, 40, 'núcleo limitado');
  assert.equal(cheio[0].id, sub.item.id, 'reincidente primeiro');
  const fora = (await buscar({ root, embed: fake, consulta: 'regra sempre numero', excluirNucleo: true, k: 50 })).itens;
  assert.ok(fora.length >= 5 && fora.every((i) => !cheio.some((c) => c.id === i.id)), 'o que sobra do núcleo continua buscável');

  const lex = await buscar({ root, embed: async () => { throw new Error('x'); }, consulta: 'logo canto', cliente: 'acme' }).catch(() => null);
  assert.equal(lex, null, 'embed explícito que falha propaga');

  const ws = join(root, 'imp');
  mkdirSync(join(ws, 'workspace', 'clientes', 'acme'), { recursive: true });
  writeFileSync(join(ws, 'workspace', 'metodo.md'), '## Story\n- Zona segura de 250px no topo\n- Fundo: estender a cor\n');
  writeFileSync(join(ws, 'workspace', 'clientes', 'acme', 'dossie.md'), '# Dossiê\n## 7. Faça\n- Faça: x\n## 9. Aprendizados\n- 2026-11-20 p1: não usa sombra\nPENDENTE\n');
  let imp = await importar({ root: ws, semVetor: true });
  assert.deepEqual([imp.fontes, imp.novos], [3, 3]);
  imp = await importar({ root: ws, semVetor: true });
  assert.equal(imp.novos, 0, 'importar é idempotente');
  assert.ok(existsSync(join(ws, 'workspace', 'metodo.md')), 'original preservado');
  b = await buscar({ root: ws, embed: fake, consulta: 'sombra', cliente: 'acme' });
  assert.ok(b.itens.some((i) => /sombra/.test(i.texto)));
  assert.ok(Object.keys(JSON.parse(readFileSync(join(ws, 'workspace', 'memoria', 'vetores.json'), 'utf8')).itens).length === 3, 'vetores completados na busca');
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (existsSync(join(LIB_DIR, 'node_modules', '@huggingface', 'transformers'))) {
  const real = mkdtempSync(join(tmpdir(), 'memoria-real-'));
  try {
    const embed = await embedderLocal();
    for (const [escopo, texto, termos] of [
      ['execucao', 'Story: estender a cor de fundo em vez de esticar a foto', ''],
      ['execucao', 'Título em caixa alta com tracking 50', 'tipografia'],
      ['cliente:acme', 'Cliente não gosta de fundo escuro', 'preto'],
      ['cliente:acme', 'Logo sempre no canto inferior direito', 'marca,assinatura'],
      ['execucao', 'Margem mínima de 90px no feed', ''],
    ]) await registrar({ root: real, embed, escopo, texto, termos });
    for (const [q, esperado] of [['onde coloco a marca do cliente?', 'Logo'], ['como adapto o post para story', 'Story'], ['posso usar fundo preto?', 'Cliente não gosta']]) {
      const r = await buscar({ root: real, embed, consulta: q, cliente: 'acme', k: 1 });
      assert.ok(r.itens[0].texto.startsWith(esperado), `modelo real: "${q}" → ${r.itens[0].texto}`);
    }
    console.log('memoria (modelo real): ok');
  } finally {
    rmSync(real, { recursive: true, force: true });
  }
}

console.log('memoria: ok');
