const fs = require('node:fs');
const path = require('node:path');

const MAX_LAYERS = 40;
const MAX_HANDOFF_CHARS = 4000;

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
  if (layers.length > MAX_LAYERS) lines.push(`- (+${layers.length - MAX_LAYERS} camadas no .ps-state.json)`);
  return lines.join('\n');
}

function build(root) {
  const state = summarizeState(readJson(path.join(root, '.ps-state.json')));
  let handoff = readText(path.join(root, '.ps-work', 'handoff.md'));
  if (handoff && handoff.length > MAX_HANDOFF_CHARS) handoff = handoff.slice(0, MAX_HANDOFF_CHARS) + '\n[...cortado]';
  const perfil = readJson(path.join(root, '.ps-perfil.json'));
  if (!state && !handoff && !perfil) return '';

  const parts = ['# Retomada do trabalho no Photoshop (gerado pelo hook session-handoff)'];
  if (handoff) parts.push('## Handoff\n' + handoff.trim());
  if (state) parts.push('## Estado em cache (.ps-state.json)\n' + state);
  if (perfil) parts.push(`## Perfil do usuário\nbastidores=${perfil.bastidores === true}`);
  parts.push('Confirme com o usuário se o documento aberto no Photoshop ainda é o mesmo antes de aplicar a próxima etapa.');
  return parts.join('\n\n') + '\n';
}

if (require.main === module) {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  process.stdout.write(build(root));
}

module.exports = { build, summarizeState };
