#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MODELO = 'Xenova/multilingual-e5-base';
export const MIN_COS = 0.815;
const MIN_LEX = 0.34;
export const LIB_VERSAO = '3.7.5';
export const LIB_DIR = join(ROOT, 'vendor', 'memoria');
const MODELOS_DIR = join(LIB_DIR, 'modelos');
const TIPOS = new Set(['regra', 'conceito', 'preferencia']);
const SIMILAR = 0.92;

export function paths(root = ROOT) {
  const dir = join(root, 'workspace', 'memoria');
  return { dir, itens: join(dir, 'aprendizados.jsonl'), vetores: join(dir, 'vetores.json') };
}

const STOP = new Set('a o as os um uma de da do das dos e em no na nos nas para pra por com sem que se ao aos é ser ter mais muito sempre nunca nao não isso esse essa este esta ele ela eu voce você me te lhe ja já'.split(' '));

export function tokens(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map((t) => t.slice(0, 6));
}

export function lexical(q, d) {
  const a = new Set(tokens(q));
  const b = new Set(tokens(d));
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / Math.sqrt(a.size * b.size);
}

export function cosseno(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function documento(item) {
  return [item.texto, item.fala, (item.termos ?? []).join(', ')].filter(Boolean).join(' | ');
}

const hash = (escopo, texto) => createHash('sha1').update(`${escopo}\n${String(texto).trim().toLowerCase()}`).digest('hex').slice(0, 12);

export function carregar(root = ROOT) {
  const p = paths(root);
  const itens = existsSync(p.itens)
    ? readFileSync(p.itens, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const porId = new Map();
  for (const it of itens) porId.set(it.id, { ...porId.get(it.id), ...it });
  const vet = existsSync(p.vetores) ? JSON.parse(readFileSync(p.vetores, 'utf8')) : { modelo: MODELO, itens: {} };
  if (vet.modelo !== MODELO) vet.itens = {};
  return { itens: [...porId.values()], vetores: vet };
}

function gravarItem(root, item) {
  const p = paths(root);
  mkdirSync(p.dir, { recursive: true });
  appendFileSync(p.itens, JSON.stringify(item) + '\n');
}

function gravarVetores(root, vet) {
  const p = paths(root);
  mkdirSync(p.dir, { recursive: true });
  writeFileSync(p.vetores, JSON.stringify(vet));
}

let embedderCache = null;
export async function embedderLocal() {
  if (embedderCache) return embedderCache;
  const req = createRequire(join(LIB_DIR, 'package.json'));
  const mod = await import(pathToFileURL(req.resolve('@huggingface/transformers')).href);
  const lib = mod.env ? mod : mod.default;
  lib.env.cacheDir = MODELOS_DIR;
  const pipe = await lib.pipeline('feature-extraction', MODELO, { dtype: 'q8' });
  embedderCache = async (textos, tipo) => {
    const pre = tipo === 'consulta' ? 'query: ' : 'passage: ';
    const out = await pipe(textos.map((t) => pre + t), { pooling: 'mean', normalize: true });
    return out.tolist().map((v) => v.map((x) => Math.round(x * 1e5) / 1e5));
  };
  return embedderCache;
}

async function embedderOuNulo(embed) {
  if (embed) return embed;
  try {
    return await embedderLocal();
  } catch {
    return null;
  }
}

export const ativos = (itens) => itens.filter((i) => i.ativo !== false);

export function noEscopo(item, cliente) {
  return item.escopo === 'execucao' || (cliente && item.escopo === `cliente:${cliente}`);
}

async function completarVetores(root, mem, embed) {
  const faltam = ativos(mem.itens).filter((i) => !mem.vetores.itens[i.id]);
  if (!faltam.length || !embed) return;
  const vs = await embed(faltam.map(documento), 'documento');
  faltam.forEach((it, k) => (mem.vetores.itens[it.id] = vs[k]));
  mem.vetores.modelo = MODELO;
  gravarVetores(root, mem.vetores);
}

export async function registrar({ escopo, tipo = 'regra', texto, fala = '', termos = [], sempre = false, pauta = '', substitui = '', origem = 'designer', root = ROOT, embed }) {
  if (!escopo || !(escopo === 'execucao' || /^cliente:[\w-]+$/.test(escopo))) throw new Error('escopo: execucao | cliente:<slug>');
  if (!TIPOS.has(tipo)) throw new Error(`tipo: ${[...TIPOS].join(' | ')}`);
  if (!texto || !String(texto).trim()) throw new Error('texto obrigatório');
  const mem = carregar(root);
  const h = hash(escopo, texto);
  const igual = mem.itens.find((i) => i.hash === h);
  if (igual) return { status: 'ja-existe', item: igual };

  const e = await embedderOuNulo(embed);
  const item = {
    id: `m-${String(mem.itens.length + 1).padStart(4, '0')}`,
    escopo, tipo, texto: String(texto).trim(), fala: String(fala).trim(),
    termos: Array.isArray(termos) ? termos : String(termos).split(',').map((t) => t.trim()).filter(Boolean),
    sempre: Boolean(sempre), reincidencias: 0, pauta, origem, ativo: true,
    criadoEm: new Date().toISOString(), hash: h,
  };

  let similares = [];
  if (e) {
    await completarVetores(root, mem, e);
    const [v] = await e([documento(item)], 'documento');
    similares = ativos(mem.itens)
      .filter((i) => i.escopo === escopo && mem.vetores.itens[i.id] && i.id !== substitui)
      .map((i) => ({ id: i.id, texto: i.texto, score: cosseno(v, mem.vetores.itens[i.id]) }))
      .filter((s) => s.score >= SIMILAR)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    mem.vetores.itens[item.id] = v;
  }

  if (substitui) {
    const velho = mem.itens.find((i) => i.id === substitui);
    if (!velho) throw new Error(`substitui: ${substitui} não existe`);
    item.substitui = substitui;
    item.reincidencias = velho.reincidencias ?? 0;
    item.sempre = item.sempre || Boolean(velho.sempre);
    gravarItem(root, { id: substitui, ativo: false, substituidoPor: item.id, alteradoEm: item.criadoEm });
  }
  gravarItem(root, item);
  if (e) gravarVetores(root, mem.vetores);
  return { status: 'registrado', item, similares, semVetor: !e };
}

export function reforcar({ id, pauta = '', root = ROOT }) {
  const it = carregar(root).itens.find((i) => i.id === id);
  if (!it) throw new Error(`${id} não existe`);
  const patch = { id, reincidencias: (it.reincidencias ?? 0) + 1, sempre: true, ultimaReincidencia: { pauta, em: new Date().toISOString() } };
  gravarItem(root, patch);
  return { ...it, ...patch };
}

export const NUCLEO_MAX = 40;

const importado = (i) => String(i.origem ?? '').startsWith('importado');

function selecionarNucleo(itens, cliente, limite) {
  return ativos(itens)
    .filter((i) => i.sempre && noEscopo(i, cliente))
    .sort((a, b) =>
      (b.reincidencias ?? 0) - (a.reincidencias ?? 0)
      || Number(importado(a)) - Number(importado(b))
      || String(b.criadoEm).localeCompare(String(a.criadoEm))
      || a.id.localeCompare(b.id))
    .slice(0, limite);
}

export function nucleo({ cliente = '', limite = NUCLEO_MAX, root = ROOT } = {}) {
  return selecionarNucleo(carregar(root).itens, cliente, limite);
}

export async function buscar({ consulta, cliente = '', k = 6, excluirNucleo = false, excluir = [], margem = 0, minimo = 0, root = ROOT, embed }) {
  const mem = carregar(root);
  const fora = new Set(excluir);
  if (excluirNucleo) for (const i of selecionarNucleo(mem.itens, cliente, NUCLEO_MAX)) fora.add(i.id);
  const cand = ativos(mem.itens).filter((i) => noEscopo(i, cliente) && !fora.has(i.id));
  if (!cand.length || !String(consulta ?? '').trim()) return { modo: 'vazio', itens: [] };
  const e = await embedderOuNulo(embed);
  let qv = null;
  if (e) {
    await completarVetores(root, mem, e);
    [qv] = await e([consulta], 'consulta');
  }
  const itens = cand
    .map((i) => {
      const lex = lexical(consulta, documento(i));
      const v = qv && mem.vetores.itens[i.id];
      const cos = v ? cosseno(qv, v) : 0;
      const score = v ? 0.75 * cos + 0.25 * lex : lex;
      return { ...i, cos, lex, score: Math.round(score * 1000) / 1000 };
    })
    .filter((i) => (qv ? true : i.score > 0))
    .filter((i) => !minimo || !qv || i.cos >= minimo || i.lex >= MIN_LEX)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  const corte = margem && itens.length ? itens[0].score - margem : -Infinity;
  return { modo: qv ? 'vetorial' : 'lexical', itens: itens.filter((i) => i.score >= corte) };
}

export function linha(i) {
  const tags = [i.tipo, i.escopo, i.sempre ? 'sempre' : '', i.reincidencias ? `reincidiu ${i.reincidencias}x` : ''].filter(Boolean).join(' · ');
  return `- [${i.id} · ${tags}] ${i.texto}${i.fala ? ` (palavras do designer: "${i.fala}")` : ''}`;
}

function aprendizadosDoDossie(md) {
  const m = String(md).match(/^##\s*9\.?\s*Aprendizados[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m);
  if (!m) return [];
  return m[1].split('\n').map((l) => l.replace(/^\s*[-*]\s*/, '').trim()).filter((l) => l && !/^PENDENTE$/i.test(l) && !l.startsWith('('));
}

function itensDoMetodo(md) {
  let secao = '';
  const out = [];
  for (const l of String(md).split('\n')) {
    const h = l.match(/^#{1,6}\s+(.+)/);
    if (h) secao = h[1].trim();
    else if (/^\s*[-*]\s+\S/.test(l)) out.push({ texto: l.replace(/^\s*[-*]\s*/, '').trim(), termos: secao ? [secao] : [] });
  }
  return out;
}

export async function importar({ root = ROOT, embed, semVetor = false } = {}) {
  const ws = join(root, 'workspace');
  const fontes = [];
  const metodo = join(ws, 'metodo.md');
  if (existsSync(metodo)) for (const t of itensDoMetodo(readFileSync(metodo, 'utf8'))) fontes.push({ escopo: 'execucao', ...t, origem: 'importado:metodo.md' });
  const cdir = join(ws, 'clientes');
  if (existsSync(cdir)) {
    for (const slug of readdirSync(cdir)) {
      const f = join(cdir, slug, 'dossie.md');
      if (!existsSync(f)) continue;
      for (const t of aprendizadosDoDossie(readFileSync(f, 'utf8'))) fontes.push({ escopo: `cliente:${slug}`, texto: t, origem: `importado:clientes/${slug}/dossie.md` });
    }
  }
  const e = semVetor ? null : await embedderOuNulo(embed);
  let novos = 0;
  for (const f of fontes) {
    const r = e ? await registrar({ ...f, tipo: 'regra', sempre: true, root, embed: e }) : registrarSemVetor({ ...f, root });
    if (r.status === 'registrado') novos++;
  }
  return { fontes: fontes.length, novos, vetores: Boolean(e) };
}

function registrarSemVetor({ escopo, texto, termos = [], origem, root }) {
  const mem = carregar(root);
  const h = hash(escopo, texto);
  if (mem.itens.some((i) => i.hash === h)) return { status: 'ja-existe' };
  const item = {
    id: `m-${String(mem.itens.length + 1).padStart(4, '0')}`, escopo, tipo: 'regra', texto: String(texto).trim(), fala: '', termos,
    sempre: true, reincidencias: 0, pauta: '', origem, ativo: true, criadoEm: new Date().toISOString(), hash: h,
  };
  gravarItem(root, item);
  return { status: 'registrado', item };
}

export async function reindexar({ root = ROOT, embed } = {}) {
  const e = embed ?? (await embedderLocal());
  const mem = carregar(root);
  mem.vetores = { modelo: MODELO, itens: {} };
  await completarVetores(root, mem, e);
  return { indexados: Object.keys(mem.vetores.itens).length };
}

function args(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) a[k] = true;
      else { a[k] = v; i++; }
    } else a._.push(argv[i]);
  }
  return a;
}

const USAGE = `uso: node scripts/memoria.mjs <comando>
  registrar --escopo execucao|cliente:<slug> --texto "<regra operacional>" [--tipo regra|conceito|preferencia]
            [--fala "<palavras do designer>"] [--termos "sinônimos,termos"] [--sempre] [--pauta <slug>] [--substitui <id>]
  reforcar <id> [--pauta <slug>]          designer corrigiu de novo algo já registrado → vira regra "sempre"
  buscar "<consulta>" [--cliente <slug>] [--k 6] [--sem-nucleo] [--excluir id1,id2] [--margem 0.05] [--minimo [cos]]
  nucleo [--cliente <slug>]               regras "sempre" (execução + cliente), no máximo ${NUCLEO_MAX}; o resto vem por busca
  listar [--cliente <slug>] [--todos]
  importar [--sem-vetor]                  traz metodo.md e Aprendizados dos dossiês (idempotente, não apaga nada)
  reindexar                               recalcula todos os vetores
  aquecer                                 baixa/carrega o modelo local`;

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  const out = (x) => process.stdout.write((typeof x === 'string' ? x : JSON.stringify(x, null, 2)) + '\n');
  try {
    if (cmd === 'registrar') {
      const r = await registrar({ escopo: a.escopo, tipo: a.tipo, texto: a.texto, fala: a.fala, termos: a.termos ?? '', sempre: a.sempre === true, pauta: a.pauta ?? '', substitui: a.substitui ?? '' });
      out([`${r.status}: ${linha(r.item)}`, ...(r.similares?.length ? ['parecidos já registrados (se for a mesma regra, use --substitui <id> ou reforcar <id>):', ...r.similares.map((s) => `  ${s.id} (${s.score.toFixed(3)}) ${s.texto}`)] : []), ...(r.semVetor ? ['aviso: modelo local indisponível, vetor fica para a próxima busca'] : [])].join('\n'));
    } else if (cmd === 'reforcar') {
      out(`reforçado: ${linha(reforcar({ id: a._[1], pauta: a.pauta ?? '' }))}`);
    } else if (cmd === 'buscar') {
      const r = await buscar({ consulta: a._.slice(1).join(' '), cliente: a.cliente ?? '', k: Number(a.k ?? 6), excluirNucleo: a['sem-nucleo'] === true, excluir: String(a.excluir ?? '').split(',').filter(Boolean), margem: Number(a.margem ?? 0), minimo: a.minimo === true ? MIN_COS : Number(a.minimo ?? 0) });
      if (a.hook) {
        if (r.itens.length) out(['## Aprendizados relevantes para esta mensagem (memória do designer)', ...r.itens.map(linha)].join('\n'));
      } else {
        out([`modo: ${r.modo}`, ...r.itens.map((i) => `${linha(i)} [score ${i.score} · cos ${Number(i.cos).toFixed(3)}]`)].join('\n'));
      }
    } else if (cmd === 'nucleo') {
      out(nucleo({ cliente: a.cliente ?? '' }).map(linha).join('\n') || '(vazio)');
    } else if (cmd === 'listar') {
      const its = carregar().itens.filter((i) => (a.todos || i.ativo !== false) && (!a.cliente || noEscopo(i, a.cliente)));
      out(its.map(linha).join('\n') || '(vazio)');
    } else if (cmd === 'importar') {
      const r = await importar({ semVetor: a['sem-vetor'] === true });
      if (!a.hook) out(r);
    } else if (cmd === 'reindexar') {
      out(await reindexar());
    } else if (cmd === 'aquecer') {
      const e = await embedderLocal();
      await e(['teste'], 'consulta');
      out('modelo pronto');
    } else {
      throw new Error(USAGE);
    }
  } catch (e) {
    process.stderr.write(e.message + '\n');
    process.exit(1);
  }
}
