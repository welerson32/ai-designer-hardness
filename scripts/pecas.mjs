#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pranchetas } from './geo.mjs';
import { paths } from './pauta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATUS = ['pendente', 'montando', 'aprovada', 'exportada'];
const CENARIOS = ['feed', 'capa'];
const GAP = 100;

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const nn = (n) => String(n).padStart(2, '0');

function formatos(root) {
  return readJson(join(root, 'templates', 'formatos.json')).formatos;
}

function medida(spec, fallback, tabela) {
  const nome = spec ?? fallback;
  if (typeof nome === 'object' && nome) return { formato: 'personalizado', W: Number(nome.W), H: Number(nome.H), margem: Number(nome.margem ?? 0) };
  const f = tabela[nome];
  if (!f) throw new Error(`formato desconhecido: ${nome}`);
  return { formato: nome, W: f.W, H: f.H, margem: f.margem ?? 0 };
}

function montar({ id, tipo, m, n, prefixo, extra }) {
  const g = pranchetas({ W: m.W, H: m.H, n, gap: GAP, margem: m.margem });
  return {
    id,
    tipo,
    ...extra,
    formato: m.formato,
    W: m.W,
    H: m.H,
    paginas: n,
    psd: `${id}.psd`,
    canvas: g.canvas,
    pranchetas: g.pranchetas.map((p) => ({ nome: `${prefixo}-${nn(p.n)}`, frame: p.frame, conteudo: p.conteudo })),
    status: 'pendente',
  };
}

export function planejar(pedido, tabela) {
  const posts = pedido?.posts;
  if (!Array.isArray(posts) || posts.length === 0) throw new Error('pedido sem posts');
  const story = medida(pedido.storyFormato, 'instagram-story', tabela);
  const pecas = [];
  posts.forEach((p, i) => {
    const num = nn(i + 1);
    const tipo = p.tipo === 'carrossel' ? 'carrossel' : 'unico';
    const n = tipo === 'carrossel' ? Number(p.paginas) : 1;
    if (tipo === 'carrossel' && !(Number.isInteger(n) && n >= 2)) throw new Error(`post ${num}: carrossel precisa de paginas >= 2`);
    if (!CENARIOS.includes(p.stories)) throw new Error(`post ${num}: stories deve ser "feed" ou "capa" (confirmar com o designer)`);
    const postId = `post-${num}`;
    pecas.push(montar({ id: postId, tipo: 'post', m: medida(p.formato, 'instagram-feed-retrato', tabela), n, prefixo: 'folha', extra: { modelo: tipo } }));
    const capa = p.stories === 'capa';
    pecas.push(montar({
      id: `story-${num}`,
      tipo: 'story',
      m: story,
      n: capa ? 1 : n,
      prefixo: 'tela',
      extra: { origem: postId, cenario: p.stories, ...(capa ? { cta: p.cta ?? null } : {}) },
    }));
  });
  return pecas;
}

function pauta(slug, root) {
  if (!slug) throw new Error('informe o slug da pauta');
  const file = join(paths(root).pautas, slug, 'pauta.json');
  return { file, m: readJson(file) };
}

const resumo = (p) => {
  const base = `${p.id} ${p.tipo === 'post' ? p.modelo : `story/${p.cenario}`} ${p.paginas}p ${p.W}x${p.H} [${p.status}]`;
  return p.cenario === 'capa' && !p.cta ? `${base} FALTA CTA` : base;
};

export function plano({ slug, pedido, root = ROOT }) {
  if (!pedido) throw new Error('--pedido obrigatório');
  const { file, m } = pauta(slug, root);
  m.pecas = planejar(readJson(pedido), formatos(root));
  writeJson(file, m);
  return { slug, pecas: m.pecas.map(resumo) };
}

export function listar({ slug, root = ROOT }) {
  const { m } = pauta(slug, root);
  return { slug, pecas: (m.pecas ?? []).map(resumo) };
}

export function obter({ slug, peca, root = ROOT }) {
  const { m } = pauta(slug, root);
  const p = (m.pecas ?? []).find((x) => x.id === peca);
  if (!p) throw new Error(`peça não encontrada: ${peca}`);
  return { pauta: m, peca: p };
}

export function status({ slug, peca, valor, root = ROOT }) {
  if (!STATUS.includes(valor)) throw new Error(`status deve ser ${STATUS.join('|')}`);
  const { file, m } = pauta(slug, root);
  const p = (m.pecas ?? []).find((x) => x.id === peca);
  if (!p) throw new Error(`peça não encontrada: ${peca}`);
  if (valor === 'aprovada' && p.cenario === 'capa' && !p.cta) throw new Error(`${peca}: falta o CTA do designer`);
  p.status = valor;
  writeJson(file, m);
  return { slug, peca, status: valor };
}

export function cta({ slug, peca, texto, root = ROOT }) {
  if (!texto) throw new Error('--texto obrigatório');
  const { file, m } = pauta(slug, root);
  const p = (m.pecas ?? []).find((x) => x.id === peca);
  if (!p || p.cenario !== 'capa') throw new Error(`${peca} não é story só-capa`);
  p.cta = texto;
  writeJson(file, m);
  return { slug, peca, cta: texto };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

const USAGE = `uso: node scripts/pecas.mjs <comando>
  plano <slug> --pedido <arquivo.json>    gera as peças (posts + stories) e grava no pauta.json
  listar <slug>                           resumo das peças
  ver <slug> <peca>                       detalhe de uma peça (pranchetas, frames)
  status <slug> <peca> <${STATUS.join('|')}>
  cta <slug> <story-NN> --texto "<CTA>"   CTA do story só-capa
pedido: {"posts":[{"tipo":"unico|carrossel","paginas":N,"formato":"instagram-feed-retrato","stories":"feed|capa","cta":"..."}],"storyFormato":"instagram-story"}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parseArgs(rest);
  try {
    const ops = {
      plano: () => plano({ slug: a._[0], pedido: a.pedido }),
      listar: () => listar({ slug: a._[0] }),
      ver: () => obter({ slug: a._[0], peca: a._[1] }).peca,
      status: () => status({ slug: a._[0], peca: a._[1], valor: a._[2] }),
      cta: () => cta({ slug: a._[0], peca: a._[1], texto: a.texto }),
    };
    if (!ops[cmd]) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(ops[cmd]()) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
