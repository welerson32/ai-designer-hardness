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
  assert.match(out, /Cliente: acme — SEM CADASTRO/);
  write('workspace/clientes/acme/cliente.json', { slug: 'acme', status: 'pronto' });
  write('workspace/clientes/acme/dossie.md', '# Dossiê — Acme\n- Tom: direto');
  out = build(root, { session_id: 's1' });
  assert.match(out, /## Dossiê do cliente \(acme\)\n# Dossiê — Acme/);
  write('workspace/clientes/acme/cliente.json', { slug: 'acme', status: 'em-cadastro' });
  assert.match(build(root, { session_id: 's1' }), /cadastro incompleto/);
  write('workspace/clientes/acme/cliente.json', { slug: 'acme', status: 'pronto' });
  out = build(root, { session_id: 's1' });
  assert.match(out, /Pauta desta sessão: Post \(2026-11-19-post\)/);
  assert.match(out, /Próxima etapa: tipografia/);
  assert.match(out, /id=12 "titulo" text bounds=1,2,3,4/);
  assert.match(out, /id=13 "foto" pixel bounds=reler/);
  assert.match(out, /bastidores=true/);
  assert.doesNotMatch(out, /Sessão sem pauta/);

  assert.match(out, /plano de peças não feito/);
  assert.doesNotMatch(out, /Método do designer/);

  write('workspace/metodo.md', '## Feed para story\n- Fundo: estender a cor');
  write('workspace/pautas/2026-11-19-post/pauta.json', {
    slug: '2026-11-19-post', nome: 'Post', cliente: 'acme', status: 'aberta', criadaEm: '2026-11-19T10:00:00Z', saida: 'C:/x',
    pecas: [
      { id: 'post-01', tipo: 'post', modelo: 'carrossel', paginas: 5, W: 1080, H: 1350, status: 'aprovada' },
      { id: 'story-01', tipo: 'story', cenario: 'feed', paginas: 5, W: 1080, H: 1920, status: 'pendente' },
      { id: 'post-02', tipo: 'post', modelo: 'unico', paginas: 1, W: 1080, H: 1350, status: 'pendente' },
      { id: 'story-02', tipo: 'story', cenario: 'capa', cta: null, paginas: 1, W: 1080, H: 1920, status: 'pendente' },
    ],
  });
  write('workspace/pautas/2026-11-19-post/estado.json', {
    version: 2,
    ativa: 'story-01',
    pecas: {
      'post-01': { doc: { id: 101, title: 'post-01.psd', width: 1080, height: 1350 }, pranchetas: [{ nome: 'folha-01', id: 5 }], layers: [{ id: 50, name: 'nao-mostrar', kind: 'text' }] },
      'story-01': { doc: { id: 202, title: 'story-01.psd', width: 1080, height: 1920 }, layers: [{ id: 70, name: 'titulo-story', kind: 'text', bounds: null }] },
    },
  });
  out = build(root, { session_id: 's1' });
  assert.match(out, /## Método do designer \(workspace\/metodo\.md\)\n## Feed para story/);
  assert.match(out, /2 posts \+ 2 stories = 4 PSDs/);
  assert.match(out, /- post-01: carrossel 5 folhas 1080x1350 \[aprovada\]/);
  assert.match(out, /- story-01: story feed inteiro \(5 telas\)/);
  assert.match(out, /- story-02: story só capa \+ CTA \(FALTA CTA\)/);
  assert.match(out, /Peça ativa: story-01/);
  assert.match(out, /Pranchetas: folha-01=id5/);
  assert.match(out, /id=70 "titulo-story" text bounds=reler/);
  assert.doesNotMatch(out, /nao-mostrar/);

  write('workspace/metodo.md', '## Geral\n' + '- regra antiga\n'.repeat(600) + '- APRENDIZADO-MAIS-RECENTE');
  write('workspace/clientes/acme/dossie.md', '# Dossiê\n' + 'x'.repeat(12000) + '\n## 9. Aprendizados\n- DOSSIE-RECENTE');
  out = build(root, { session_id: 's1' });
  assert.match(out, /APRENDIZADO-MAIS-RECENTE/);
  assert.match(out, /DOSSIE-RECENTE/);
  assert.match(out, /aviso: metodo\.md passou/);

  out = build(root, { session_id: 'outra' });
  assert.match(out, /Sessão sem pauta/);

  write('workspace/pautas/2026-11-19-post/estado.json', '{quebrado');
  assert.doesNotMatch(build(root, { session_id: 's1' }), /Estado em cache/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('session-handoff: ok');
