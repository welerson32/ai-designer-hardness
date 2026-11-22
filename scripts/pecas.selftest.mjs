import assert from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planejar, plano, listar, obter, status, cta } from './pecas.mjs';

const tabela = {
  'instagram-feed-retrato': { W: 1080, H: 1350, margem: 60 },
  'instagram-feed-quadrado': { W: 1080, H: 1080, margem: 60 },
  'instagram-story': { W: 1080, H: 1920, margem: 60 },
};

const pecas = planejar({
  posts: [
    { tipo: 'carrossel', paginas: 5, stories: 'feed' },
    { tipo: 'unico', formato: 'instagram-feed-quadrado', stories: 'capa', cta: 'Compre agora' },
    { tipo: 'carrossel', paginas: 3, stories: 'capa' },
  ],
}, tabela);

assert.deepStrictEqual(pecas.map((p) => p.id), ['post-01', 'story-01', 'post-02', 'story-02', 'post-03', 'story-03']);
const [p1, s1, p2, s2, p3, s3] = pecas;
assert.strictEqual(p1.psd, 'post-01.psd');
assert.strictEqual(p1.pranchetas.length, 5);
assert.deepStrictEqual(p1.pranchetas[1], { nome: 'folha-02', frame: '1180,0,2260,1350', conteudo: '1240,60,2200,1290' });
assert.deepStrictEqual(p1.canvas, { W: 5800, H: 1350 });
assert.strictEqual(s1.cenario, 'feed');
assert.strictEqual(s1.origem, 'post-01');
assert.strictEqual(s1.pranchetas.length, 5);
assert.deepStrictEqual(s1.pranchetas[4].nome, 'tela-05');
assert.strictEqual(s1.pranchetas[0].frame, '0,0,1080,1920');
assert.strictEqual(p2.H, 1080);
assert.strictEqual(p2.pranchetas.length, 1);
assert.strictEqual(s2.pranchetas.length, 1);
assert.strictEqual(s2.cta, 'Compre agora');
assert.strictEqual(p3.pranchetas.length, 3);
assert.strictEqual(s3.pranchetas.length, 1);
assert.strictEqual(s3.cta, null);
assert.strictEqual(pecas.filter((p) => p.tipo === 'story').length, 3);

assert.throws(() => planejar({ posts: [{ tipo: 'unico' }] }, tabela), /feed" ou "capa/);
assert.throws(() => planejar({ posts: [{ tipo: 'carrossel', paginas: 1, stories: 'feed' }] }, tabela), /paginas >= 2/);
assert.throws(() => planejar({ posts: [] }, tabela), /sem posts/);
assert.throws(() => planejar({ posts: [{ tipo: 'unico', formato: 'xyz', stories: 'feed' }] }, tabela), /formato desconhecido/);

const root = mkdtempSync(join(tmpdir(), 'pecas-'));
try {
  mkdirSync(join(root, 'templates'));
  writeFileSync(join(root, 'templates', 'formatos.json'), JSON.stringify({ formatos: tabela }));
  const dir = join(root, 'workspace', 'pautas', 'p1');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'pauta.json'), JSON.stringify({ slug: 'p1', saida: 'C:/x' }));
  const pedido = join(root, 'pedido.json');
  writeFileSync(pedido, JSON.stringify({ posts: [{ tipo: 'carrossel', paginas: 2, stories: 'capa' }] }));

  const r = plano({ slug: 'p1', pedido, root });
  assert.deepStrictEqual(r.pecas, ['post-01 carrossel 2p 1080x1350 [pendente]', 'story-01 story/capa 1p 1080x1920 [pendente] FALTA CTA']);
  assert.throws(() => status({ slug: 'p1', peca: 'story-01', valor: 'aprovada', root }), /falta o CTA/);
  assert.strictEqual(obter({ slug: 'p1', peca: 'story-01', root }).peca.status, 'pendente');
  cta({ slug: 'p1', peca: 'story-01', texto: 'Arraste', root });
  status({ slug: 'p1', peca: 'story-01', valor: 'aprovada', root });
  status({ slug: 'p1', peca: 'post-01', valor: 'montando', root });
  assert.deepStrictEqual(listar({ slug: 'p1', root }).pecas, ['post-01 carrossel 2p 1080x1350 [montando]', 'story-01 story/capa 1p 1080x1920 [aprovada]']);
  assert.throws(() => status({ slug: 'p1', peca: 'post-01', valor: 'feito', root }), /status deve ser/);
  assert.throws(() => cta({ slug: 'p1', peca: 'post-01', texto: 'x', root }), /não é story só-capa/);
  assert.strictEqual(JSON.parse(readFileSync(join(dir, 'pauta.json'), 'utf8')).saida, 'C:/x');
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('pecas: ok');
