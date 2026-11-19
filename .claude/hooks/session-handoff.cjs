const fs = require('node:fs');
const path = require('node:path');

const MAX_LAYERS = 40;
const MAX_HANDOFF_CHARS = 4000;
const MAX_PAUTAS = 15;
const MAX_DOSSIE_CHARS = 9000;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function summarizeState(state) {
  if (!state?.doc) return null;
  const d = state.doc;
  const lines = [`Documento: "${d.title ?? '?'}" id=${d.id} ${d.width}x${d.height}px @${d.resolution ?? '?'} (lido em ${d.at ?? '?'})`];
  const layers = Array.isArray(state.layers) ? state.layers : [];
  for (const l of layers.slice(0, MAX_LAYERS)) {
    const b = l.bounds ? `${l.bounds.left},${l.bounds.top},${l.bounds.right},${l.bounds.bottom}` : 'reler';
    lines.push(`- id=${l.id} "${l.name}" ${l.kind ?? ''} bounds=${b}`);
  }
  if (layers.length > MAX_LAYERS) lines.push(`- (+${layers.length - MAX_LAYERS} camadas no estado.json)`);
  return lines.join('\n');
}

function openPautas(pautasDir) {
  let dirs = [];
  try {
    dirs = fs.readdirSync(pautasDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }
  return dirs
    .map((d) => readJson(path.join(pautasDir, d.name, 'pauta.json')))
    .filter((m) => m && m.status !== 'concluida')
    .sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
}

function build(root, input = {}) {
  const ws = path.join(root, 'workspace');
  const pautasDir = path.join(ws, 'pautas');
  const sessionId = input.session_id ?? '?';
  const sessoes = readJson(path.join(ws, 'sessoes.json')) ?? {};
  const slug = sessoes[sessionId];
  const perfil = readJson(path.join(ws, 'perfil.json'));

  const parts = [`# Contexto do harness (hook session-handoff)\nID desta sessão: ${sessionId}`];
  if (perfil) parts.push(`Perfil do usuário: bastidores=${perfil.bastidores === true}`);

  const meta = slug ? readJson(path.join(pautasDir, slug, 'pauta.json')) : null;
  if (meta) {
    const dir = path.join(pautasDir, slug);
    parts.push(`## Pauta desta sessão: ${meta.nome} (${slug}) — status ${meta.status}\nPasta: workspace/pautas/${slug}\nSaída: ${meta.saida}`);
    let handoff = readText(path.join(dir, 'handoff.md'));
    if (handoff) {
      if (handoff.length > MAX_HANDOFF_CHARS) handoff = handoff.slice(0, MAX_HANDOFF_CHARS) + '\n[...cortado]';
      parts.push('## Handoff\n' + handoff.trim());
    }
    if (meta.cliente) {
      const cdir = path.join(ws, 'clientes', meta.cliente);
      const cmeta = readJson(path.join(cdir, 'cliente.json'));
      let dossie = readText(path.join(cdir, 'dossie.md'));
      if (!cmeta) {
        parts.push(`## Cliente: ${meta.cliente} — SEM CADASTRO\nOfereça o cadastro (skill ps-cliente, em sessão própria) antes de trabalhar.`);
      } else if (dossie) {
        if (dossie.length > MAX_DOSSIE_CHARS) dossie = dossie.slice(0, MAX_DOSSIE_CHARS) + '\n[...cortado — enxugar o dossiê]';
        const aviso = cmeta.status === 'pronto' ? '' : ` — status ${cmeta.status}: cadastro incompleto, ofereça concluir (skill ps-cliente)`;
        parts.push(`## Dossiê do cliente (${meta.cliente})${aviso}\n` + dossie.trim());
      }
    }
    const state = summarizeState(readJson(path.join(dir, 'estado.json')));
    if (state) parts.push('## Estado em cache\n' + state);
    parts.push('Confirme com o usuário se o arquivo aberto no Photoshop ainda é o desta pauta antes da próxima etapa. Assunto de outra pauta → lembrar de abrir uma sessão nova.');
  } else {
    const abertas = openPautas(pautasDir).slice(0, MAX_PAUTAS);
    const lista = abertas.length
      ? abertas.map((m) => `- ${m.slug}: ${m.nome}${m.cliente ? ` [${m.cliente}]` : ''}`).join('\n')
      : '(nenhuma pauta aberta)';
    parts.push(`## Sessão sem pauta\nPautas abertas:\n${lista}\n\nAntes de trabalhar, pergunte ao usuário qual pauta seguir ou se é uma nova (skill ps-pauta). Uma sessão = uma pauta.`);
  }
  return parts.join('\n\n') + '\n';
}

if (require.main === module) {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let input = {};
    try {
      input = JSON.parse(buf || '{}');
    } catch {}
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    process.stdout.write(build(root, input));
  });
}

module.exports = { build, summarizeState };
