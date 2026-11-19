const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build } = require('./session-handoff.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
try {
  assert.strictEqual(build(root), '');

  fs.writeFileSync(path.join(root, '.ps-state.json'), JSON.stringify({
    doc: { id: 101, title: 'post.psd', width: 1080, height: 1350, resolution: 72, at: 'x' },
    layers: [
      { id: 12, name: 'titulo', kind: 'text', bounds: { left: 1, top: 2, right: 3, bottom: 4 } },
      { id: 13, name: 'foto', kind: 'pixel', bounds: null },
    ],
  }));
  let out = build(root);
  assert.match(out, /id=101 1080x1350px/);
  assert.match(out, /id=12 "titulo" text bounds=1,2,3,4/);
  assert.match(out, /id=13 "foto" pixel bounds=reler/);
  assert.doesNotMatch(out, /## Handoff/);

  fs.mkdirSync(path.join(root, '.ps-work'));
  fs.writeFileSync(path.join(root, '.ps-work', 'handoff.md'), 'Próxima etapa: tipografia');
  fs.writeFileSync(path.join(root, '.ps-perfil.json'), JSON.stringify({ bastidores: true }));
  out = build(root);
  assert.match(out, /## Handoff\nPróxima etapa: tipografia/);
  assert.match(out, /bastidores=true/);

  fs.writeFileSync(path.join(root, '.ps-state.json'), '{quebrado');
  assert.doesNotMatch(build(root), /Estado em cache/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('session-handoff: ok');
