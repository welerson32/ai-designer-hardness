const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('./session-handoff.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
const write = (rel, data) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};

try {
  let out = build(root, { session_id: 's1' });
  assert.match(out, /ID desta sessão: s1/);
  assert.match(out, /nenhuma pauta aberta/);

  write('workspace/pautas/2026-11-19-post/pauta.json', { slug: '2026-11-19-post', nome: 'Post', cliente: 'acme', status: 'aberta', criadaEm: '2026-11-19T10:00:00Z', saida: 'C:/Docs/AI Designer/2026-11-19-post' });
  write('workspace/pautas/2026-11-18-velha/pauta.json', { slug: '2026-11-18-velha', nome: 'Velha', status: 'concluida', criadaEm: '2026-11-18' });
  out = build(root, { session_id: 's1' });
  assert.match(out, /- 2026-11-19-post: Post \[acme\]/);
  assert.doesNotMatch(out, /Velha/);
  assert.match(out, /skill ps-pauta/);

  write('workspace/sessoes.json', { s1: '2026-11-19-post' });
  write('workspace/pautas/2026-11-19-post/handoff.md', '# Pauta — Post\nPróxima etapa: tipografia');
  write('workspace/pautas/2026-11-19-post/estado.json', {
    doc: { id: 101, title: 'post.psd', width: 1080, height: 1350, resolution: 72, at: 'x' },
    layers: [
      { id: 12, name: 'titulo', kind: 'text', bounds: { left: 1, top: 2, right: 3, bottom: 4 } },
      { id: 13, name: 'foto', kind: 'pixel', bounds: null },
    ],
  });
  write('workspace/perfil.json', { bastidores: true });
  out = build(root, { session_id: 's1' });
  assert.match(out, /Pauta desta sessão: Post \(2026-11-19-post\)/);
  assert.match(out, /Próxima etapa: tipografia/);
  assert.match(out, /id=12 "titulo" text bounds=1,2,3,4/);
  assert.match(out, /id=13 "foto" pixel bounds=reler/);
  assert.match(out, /bastidores=true/);
  assert.doesNotMatch(out, /Sessão sem pauta/);

  out = build(root, { session_id: 'outra' });
  assert.match(out, /Sessão sem pauta/);

  write('workspace/pautas/2026-11-19-post/estado.json', '{quebrado');
  assert.doesNotMatch(build(root, { session_id: 's1' }), /Estado em cache/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('session-handoff: ok');
