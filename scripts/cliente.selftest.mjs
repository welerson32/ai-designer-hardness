import assert from 'node:assert';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nova, listar, checar, concluir, status } from './cliente.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = mkdtempSync(join(tmpdir(), 'cliente-'));
try {
  mkdirSync(join(root, 'templates'));
  for (const f of ['dossie.md', 'identidade.json']) cpSync(join(repo, 'templates', f), join(root, 'templates', f));

  assert.strictEqual(status({ slug: 'padaria-sao-joao', root }), 'inexistente');
  const c = nova({ nome: 'Padaria São João', root });
  assert.strictEqual(c.slug, 'padaria-sao-joao');
  assert.strictEqual(status({ slug: c.slug, root }), 'em-cadastro');
  assert.throws(() => nova({ nome: 'Padaria São João', root }), /já existe/);
  assert.match(readFileSync(join(c.pasta, 'dossie.md'), 'utf8'), /# Dossiê — Padaria São João/);

  let r = checar({ slug: c.slug, root });
  assert.strictEqual(r.pronto, false);
  assert.ok(r.pendencias.length > 5);
  assert.ok(r.faltando.some((f) => f.startsWith('logo')));
  assert.ok(r.faltando.some((f) => f.startsWith('arquivo guia')));
  assert.throws(() => concluir({ slug: c.slug, root }), /incompleto/);

  writeFileSync(join(c.pasta, 'assets', 'logo.png'), 'x');
  writeFileSync(join(c.pasta, 'referencias', 'guia.psd'), 'x');
  writeFileSync(join(c.pasta, 'identidade.json'), JSON.stringify({
    version: 1,
    assets: { logo: ['assets/logo.png', 'C:/nao/existe/logo.svg'], fontes: [], outros: [] },
    guia: ['referencias/guia.psd'],
  }));
  writeFileSync(join(c.pasta, 'dossie.md'), '# Dossiê — Padaria\n> nota com PENDENTE ignorada\n- Tom: acolhedor\n');
  r = checar({ slug: c.slug, root });
  assert.deepStrictEqual(r.pendencias, []);
  assert.deepStrictEqual(r.assetsAusentes, ['C:/nao/existe/logo.svg']);
  assert.strictEqual(r.pronto, false);

  writeFileSync(join(c.pasta, 'identidade.json'), JSON.stringify({ version: 1, assets: { logo: ['assets/logo.png'] }, guia: ['referencias/guia.psd'] }));
  assert.strictEqual(checar({ slug: c.slug, root }).pronto, true);
  assert.strictEqual(concluir({ slug: c.slug, root }).status, 'pronto');
  assert.deepStrictEqual(listar({ root }), [{ slug: 'padaria-sao-joao', nome: 'Padaria São João', status: 'pronto' }]);

  writeFileSync(join(c.pasta, 'dossie.md'), 'x'.repeat(9500));
  assert.ok(checar({ slug: c.slug, root }).faltando.some((f) => f.includes('grande demais')));
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('cliente: ok');
