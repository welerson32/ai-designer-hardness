import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivos = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name);
  if (e.isDirectory()) return e.name === 'recipes' ? [] : arquivos(p);
  return /\.(mjs|cjs)$/.test(e.name) ? [p] : [];
});

const lista = [...arquivos(join(ROOT, 'scripts')), ...arquivos(join(ROOT, '.claude', 'hooks'))];
for (const f of lista) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${f}\n${r.stderr}`);
}
console.log(`sintaxe: ok (${lista.length} arquivos)`);
