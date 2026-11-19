#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './pauta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIE_MAX_CHARS = 9000;

const readJson = (file, fallback) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

export const clientesDir = (root = ROOT) => join(root, 'workspace', 'clientes');

export function status({ slug, root = ROOT }) {
  const meta = readJson(join(clientesDir(root), slug, 'cliente.json'), null);
  return meta ? meta.status : 'inexistente';
}

export function nova({ nome, root = ROOT }) {
  if (!nome) throw new Error('--nome obrigatório');
  const slug = slugify(nome);
  const pasta = join(clientesDir(root), slug);
  if (existsSync(join(pasta, 'cliente.json'))) throw new Error(`cliente já existe: ${slug}`);
  mkdirSync(join(pasta, 'referencias'), { recursive: true });
  mkdirSync(join(pasta, 'assets'), { recursive: true });

  writeJson(join(pasta, 'cliente.json'), { slug, nome, status: 'em-cadastro', criadoEm: new Date().toISOString() });
  const tpl = readFileSync(join(root, 'templates', 'dossie.md'), 'utf8');
  writeFileSync(join(pasta, 'dossie.md'), tpl.replaceAll('{{nome}}', nome));
  writeFileSync(join(pasta, 'identidade.json'), readFileSync(join(root, 'templates', 'identidade.json'), 'utf8'));
  return { slug, pasta };
}

export function listar({ root = ROOT } = {}) {
  const dir = clientesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson(join(dir, d.name, 'cliente.json'), null))
    .filter(Boolean)
    .map(({ slug, nome, status }) => ({ slug, nome, status }));
}

function resolveAsset(pasta, p) {
  return isAbsolute(p) ? p : join(pasta, p);
}

export function checar({ slug, root = ROOT }) {
  const pasta = join(clientesDir(root), slug);
  const meta = readJson(join(pasta, 'cliente.json'), null);
  if (!meta) throw new Error(`cliente não encontrado: ${slug}`);

  const dossie = existsSync(join(pasta, 'dossie.md')) ? readFileSync(join(pasta, 'dossie.md'), 'utf8') : '';
  const pendencias = dossie
    .split(/\r?\n/)
    .filter((l) => /PENDENTE/.test(l) && !l.startsWith('>'))
    .map((l) => l.replace(/^[-|#\s\d.]+/, '').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());

  const ident = readJson(join(pasta, 'identidade.json'), null);
  const lista = (k) => (Array.isArray(ident?.assets?.[k]) ? ident.assets[k] : []);
  const declarados = [...lista('logo'), ...lista('fontes'), ...lista('outros'), ...(Array.isArray(ident?.guia) ? ident.guia : [])];
  const assetsAusentes = declarados.filter((p) => !existsSync(resolveAsset(pasta, p)));

  const conteudo = (sub) => (existsSync(join(pasta, sub)) ? readdirSync(join(pasta, sub)).filter((f) => !f.startsWith('.')) : []);
  const faltando = [];
  if (!ident) faltando.push('identidade.json ilegível');
  if (lista('logo').length === 0) faltando.push('logo (pedir arquivo ou caminho)');
  if ((ident?.guia ?? []).length === 0 && conteudo('referencias').length === 0) faltando.push('arquivo guia (PSD, PDF ou imagem)');
  if (dossie.length > DOSSIE_MAX_CHARS) faltando.push(`dossiê grande demais (${dossie.length} > ${DOSSIE_MAX_CHARS} caracteres): enxugar`);

  return {
    slug,
    status: meta.status,
    pronto: pendencias.length === 0 && assetsAusentes.length === 0 && faltando.length === 0,
    pendencias,
    assetsAusentes,
    faltando,
    arquivos: { referencias: conteudo('referencias'), assets: conteudo('assets') },
  };
}

export function concluir({ slug, root = ROOT }) {
  const r = checar({ slug, root });
  if (!r.pronto) throw new Error(`cadastro incompleto: ${JSON.stringify({ pendencias: r.pendencias, assetsAusentes: r.assetsAusentes, faltando: r.faltando })}`);
  const file = join(clientesDir(root), slug, 'cliente.json');
  const meta = readJson(file, {});
  meta.status = 'pronto';
  meta.concluidoEm = new Date().toISOString();
  writeJson(file, meta);
  return { slug, status: meta.status };
}

const USAGE = `uso: node scripts/cliente.mjs <comando>
  nova --nome "<nome>"   cria a pasta do cliente com dossiê e identidade em branco
  listar                 clientes e status (em-cadastro | pronto)
  checar <slug>          lacunas do dossiê, assets ausentes, o que pedir ao designer
  concluir <slug>        marca como pronto (só sem lacunas)`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...rest] = process.argv.slice(2);
  const nomeIdx = rest.indexOf('--nome');
  try {
    const ops = {
      nova: () => nova({ nome: nomeIdx >= 0 ? rest[nomeIdx + 1] : undefined }),
      listar: () => listar(),
      checar: () => checar({ slug: rest[0] }),
      concluir: () => concluir({ slug: rest[0] }),
    };
    if (!ops[cmd]) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(ops[cmd]()) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
