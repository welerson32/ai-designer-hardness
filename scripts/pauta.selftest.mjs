import assert from 'node:assert';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify, nova, listar, vincular, encerrar, saida } from './pauta.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(join(tmpdir(), 'pauta-'));
const saidaBase = join(root, 'Documentos', 'AI Designer');
try {
  mkdirSync(join(root, 'templates'));
  cpSync(join(repo, 'templates', 'handoff.md'), join(root, 'templates', 'handoff.md'));

  assert.strictEqual(slugify('Post Black Friday — Ação!'), 'post-black-friday-acao');

  const a = nova({ nome: 'Post Black Friday', cliente: 'Padaria São João', root, saidaBase, data: '2026-11-19' });
  assert.strictEqual(a.slug, '2026-11-19-post-black-friday');
  assert.ok(existsSync(join(a.pasta, 'etapas')));
  assert.ok(existsSync(a.saida));
  const handoff = readFileSync(join(a.pasta, 'handoff.md'), 'utf8');
  assert.match(handoff, /# Pauta — Post Black Friday/);
  assert.match(handoff, /Cliente: padaria-sao-joao/);
  assert.doesNotMatch(handoff, /\{\{/);

  const b = nova({ nome: 'Post Black Friday', root, saidaBase, data: '2026-11-19', sessao: 'sess-1' });
  assert.strictEqual(b.slug, '2026-11-19-post-black-friday-2');
  assert.deepStrictEqual(JSON.parse(readFileSync(join(root, 'workspace', 'sessoes.json'), 'utf8')), { 'sess-1': b.slug });

  vincular({ slug: a.slug, sessao: 'sess-2', root });
  assert.strictEqual(listar({ root }).length, 2);

  encerrar({ slug: a.slug, root });
  assert.deepStrictEqual(listar({ root }).map((p) => p.slug), [b.slug]);
  assert.strictEqual(listar({ root, todas: true }).length, 2);

  assert.strictEqual(saida({ slug: b.slug, root }).saida, b.saida);
  assert.throws(() => vincular({ slug: 'nao-existe', sessao: 'x', root }), /não encontrada/);
  assert.throws(() => nova({ root, saidaBase }), /--nome/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('pauta: ok');
