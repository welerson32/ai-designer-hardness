#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA_NOME = 'AI Designer';

export function paths(root = ROOT) {
  const workspace = join(root, 'workspace');
  return {
    workspace,
    pautas: join(workspace, 'pautas'),
    clientes: join(workspace, 'clientes'),
    sessoes: join(workspace, 'sessoes.json'),
    template: join(root, 'templates', 'handoff.md'),
  };
}

export function documentsDir() {
  if (process.env.AI_DESIGNER_SAIDA) return process.env.AI_DESIGNER_SAIDA;
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('powershell', ['-NoProfile', '-Command', "[Environment]::GetFolderPath('MyDocuments')"], { encoding: 'utf8' }).trim();
      if (out) return join(out, SAIDA_NOME);
    } catch {}
  }
  return join(homedir(), 'Documents', SAIDA_NOME);
}

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const today = () => new Date().toISOString().slice(0, 10);

export function nova({ nome, cliente = '', sessao, root = ROOT, saidaBase = documentsDir(), data = today() }) {
  if (!nome) throw new Error('--nome obrigatório');
  const p = paths(root);
  mkdirSync(p.pautas, { recursive: true });
  const base = `${data}-${slugify(nome)}`;
  let slug = base;
  for (let i = 2; existsSync(join(p.pautas, slug)); i++) slug = `${base}-${i}`;

  const pasta = join(p.pautas, slug);
  const saida = join(saidaBase, slug);
  mkdirSync(join(pasta, 'etapas'), { recursive: true });
  mkdirSync(saida, { recursive: true });

  const clienteSlug = cliente ? slugify(cliente) : '';
  writeJson(join(pasta, 'pauta.json'), { slug, nome, cliente: clienteSlug, status: 'aberta', criadaEm: new Date().toISOString(), saida });
  writeJson(join(pasta, 'estado.json'), { version: 1 });
  const tpl = existsSync(p.template) ? readFileSync(p.template, 'utf8') : '# Pauta — {{nome}}\n';
  writeFileSync(join(pasta, 'handoff.md'), tpl
    .replaceAll('{{nome}}', nome)
    .replaceAll('{{cliente}}', clienteSlug || '(sem cliente)')
    .replaceAll('{{data}}', data)
    .replaceAll('{{saida}}', saida));

  if (sessao) vincular({ slug, sessao, root });
  return { slug, pasta, saida };
}

export function listar({ todas = false, root = ROOT } = {}) {
  const p = paths(root);
  if (!existsSync(p.pautas)) return [];
  return readdirSync(p.pautas, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson(join(p.pautas, d.name, 'pauta.json'), null))
    .filter((m) => m && (todas || m.status !== 'concluida'))
    .map(({ slug, nome, cliente, status, criadaEm }) => ({ slug, nome, cliente, status, criadaEm }))
    .sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
}

function meta(slug, root) {
  const file = join(paths(root).pautas, slug, 'pauta.json');
  const m = readJson(file, null);
  if (!m) throw new Error(`pauta não encontrada: ${slug}`);
  return { file, m };
}

export function vincular({ slug, sessao, root = ROOT }) {
  if (!sessao) throw new Error('--sessao obrigatório');
  meta(slug, root);
  const p = paths(root);
  mkdirSync(p.workspace, { recursive: true });
  const map = readJson(p.sessoes, {});
  map[sessao] = slug;
  writeJson(p.sessoes, map);
  return { slug, sessao };
}

export function encerrar({ slug, root = ROOT }) {
  const { file, m } = meta(slug, root);
  m.status = 'concluida';
  m.concluidaEm = new Date().toISOString();
  writeJson(file, m);
  return { slug, status: m.status };
}

export function saida({ slug, root = ROOT }) {
  const { m } = meta(slug, root);
  mkdirSync(m.saida, { recursive: true });
  return { slug, saida: m.saida };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[k] = true;
      else out[k] = argv[++i];
    } else out._.push(argv[i]);
  }
  return out;
}

const USAGE = `uso: node scripts/pauta.mjs <comando>
  nova --nome "<nome>" [--cliente <cliente>] [--sessao <id>]   cria pauta + pasta de saída
  listar [--todas]                                               pautas abertas (ou todas)
  vincular <slug> --sessao <id>                                  associa a sessão à pauta
  saida <slug>                                                   caminho da pasta de saída (cria se faltar)
  encerrar <slug>                                                marca a pauta como concluída`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parseArgs(rest);
  try {
    const ops = {
      nova: () => nova({ nome: a.nome, cliente: a.cliente, sessao: a.sessao }),
      listar: () => listar({ todas: a.todas === true }),
      vincular: () => vincular({ slug: a._[0], sessao: a.sessao }),
      saida: () => saida({ slug: a._[0] }),
      encerrar: () => encerrar({ slug: a._[0] }),
    };
    if (!ops[cmd]) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(ops[cmd]()) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
