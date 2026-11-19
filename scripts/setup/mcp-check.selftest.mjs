import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerServidores, testarServidor } from './mcp-check.mjs';

const dir = mkdtempSync(join(tmpdir(), 'mcpcheck-'));
try {
  const responde = join(dir, 'responde.cjs');
  writeFileSync(responde, `process.stdin.on('data', (d) => { const m = JSON.parse(String(d).split('\\n')[0]); process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { ok: 1 } }) + '\\n'); });`);
  const sai = join(dir, 'sai.cjs');
  writeFileSync(sai, `process.stderr.write('ImportError: no module named mcp'); process.exit(1);`);
  const mudo = join(dir, 'mudo.cjs');
  writeFileSync(mudo, `setInterval(() => {}, 1000);`);

  let r = await testarServidor({ nome: 'a', command: process.execPath, args: [responde] });
  assert.strictEqual(r.ok, true, JSON.stringify(r));

  r = await testarServidor({ nome: 'b', command: process.execPath, args: [sai] });
  assert.strictEqual(r.ok, false);
  assert.match(r.motivo, /encerrou antes de responder/);
  assert.match(r.stderr, /ImportError/);

  r = await testarServidor({ nome: 'c', command: process.execPath, args: [mudo] }, { timeoutMs: 1500 });
  assert.strictEqual(r.ok, false);
  assert.match(r.motivo, /sem resposta/);

  r = await testarServidor({ nome: 'd', command: 'comando-que-nao-existe-xyz', args: [] });
  assert.strictEqual(r.ok, false);
  assert.match(r.motivo, /não encontrado no PATH/);

  writeFileSync(join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { photoshop: { command: 'uv', args: ['run'] } } }));
  assert.deepStrictEqual(lerServidores(dir), [{ nome: 'photoshop', command: 'uv', args: ['run'] }]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('mcp-check: ok');
