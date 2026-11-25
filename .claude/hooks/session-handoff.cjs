const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function nucleoMemoria(root, cliente) {
  const args = [path.join(root, 'scripts', 'memoria.mjs'), 'nucleo'];
  if (cliente) args.push('--cliente', cliente);
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 8000, windowsHide: true });
  const txt = r.status === 0 ? (r.stdout ?? '').trim() : '';
  return [
    `## Memória do designer — núcleo (regras "sempre"${cliente ? `, execução + cliente ${cliente}` : ', execução'})`,
    txt && txt !== '(vazio)' ? txt : '(nenhuma regra "sempre" ainda)',
    'Demais aprendizados: chegam por mensagem (hook) e por etapa (`node scripts/memoria.mjs buscar "<etapa>" --cliente <slug>`, obrigatório antes de planejar cada etapa). Seja fiel ao texto e às palavras do designer.',
  ].join('\n');
}

const MAX_LAYERS = 40;
const MAX_PAUTAS = 15;
const AVISO_HANDOFF_CHARS = 6000;
const AVISO_DOSSIE_CHARS = 9000;
const AVISO_METODO_CHARS = 6000;

function aviso(texto, limite, arquivo) {
  return texto.length > limite
    ? `\n[aviso: ${arquivo} passou de ${limite} caracteres — consolide frases repetidas sem descartar nenhum aprendizado]`
    : '';
}

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

function docLine(d) {
  return `Documento: "${d.title ?? '?'}" id=${d.id} ${d.width}x${d.height}px @${d.resolution ?? '?'} (lido em ${d.at ?? '?'})`;
}

function layerLines(layers) {
  const list = Array.isArray(layers) ? layers : [];
  const lines = list.slice(0, MAX_LAYERS).map((l) => {
    const b = l.bounds ? `${l.bounds.left},${l.bounds.top},${l.bounds.right},${l.bounds.bottom}` : 'reler';
    return `- id=${l.id} "${l.name}" ${l.kind ?? ''} bounds=${b}`;
  });
  if (list.length > MAX_LAYERS) lines.push(`- (+${list.length - MAX_LAYERS} camadas no estado.json)`);
  return lines;
}

function summarizeState(state) {
  if (state?.pecas && typeof state.pecas === 'object') {
    const ids = Object.keys(state.pecas);
    if (!ids.length) return null;
    const lines = [`Peça ativa: ${state.ativa ?? '?'}`];
    for (const id of ids) {
      const p = state.pecas[id] ?? {};
      lines.push(`### ${id}${id === state.ativa ? ' (ativa)' : ''}`);
      if (p.doc) lines.push(docLine(p.doc));
      if (Array.isArray(p.pranchetas) && p.pranchetas.length) lines.push(`Pranchetas: ${p.pranchetas.map((a) => `${a.nome}=id${a.id ?? '?'}`).join(' ')}`);
      if (id === state.ativa) lines.push(...layerLines(p.layers));
    }
    return lines.join('\n');
  }
  if (!state?.doc) return null;
  return [docLine(state.doc), ...layerLines(state.layers)].join('\n');
}

function summarizePecas(pecas) {
  if (!Array.isArray(pecas) || !pecas.length) return null;
  const n = (t) => pecas.filter((p) => p.tipo === t).length;
  const lines = [`${n('post')} posts + ${n('story')} stories = ${pecas.length} PSDs`];
  for (const p of pecas) {
    const tipo = p.tipo === 'post' ? (p.modelo === 'carrossel' ? `carrossel ${p.paginas} folhas` : 'post único') : `story ${p.cenario === 'capa' ? `só capa + CTA${p.cta ? ` "${p.cta}"` : ' (FALTA CTA)'}` : `feed inteiro (${p.paginas} telas)`}`;
    lines.push(`- ${p.id}: ${tipo} ${p.W}x${p.H} [${p.status}]`);
  }
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
  const temMemoria = fs.existsSync(path.join(ws, 'memoria', 'aprendizados.jsonl'));
  const metodo = temMemoria ? null : readText(path.join(ws, 'metodo.md'));
  if (metodo && metodo.trim()) {
    parts.push('## Método do designer (workspace/metodo.md)\n' + metodo.trim() + aviso(metodo, AVISO_METODO_CHARS, 'metodo.md'));
  }

  const meta = slug ? readJson(path.join(pautasDir, slug, 'pauta.json')) : null;
  if (meta) {
    const dir = path.join(pautasDir, slug);
    parts.push(`## Pauta desta sessão: ${meta.nome} (${slug}) — status ${meta.status}\nPasta: workspace/pautas/${slug}\nSaída: ${meta.saida}`);
    const handoff = readText(path.join(dir, 'handoff.md'));
    if (handoff) {
      parts.push('## Handoff\n' + handoff.trim() + aviso(handoff, AVISO_HANDOFF_CHARS, 'handoff.md'));
    }
    if (meta.cliente) {
      const cdir = path.join(ws, 'clientes', meta.cliente);
      const cmeta = readJson(path.join(cdir, 'cliente.json'));
      const dossie = readText(path.join(cdir, 'dossie.md'));
      if (!cmeta) {
        parts.push(`## Cliente: ${meta.cliente} — SEM CADASTRO\nOfereça o cadastro (skill ps-cliente, em sessão própria) antes de trabalhar.`);
      } else if (dossie) {
        const status = cmeta.status === 'pronto' ? '' : ` — status ${cmeta.status}: cadastro incompleto, ofereça concluir (skill ps-cliente)`;
        parts.push(`## Dossiê do cliente (${meta.cliente})${status}\n` + dossie.trim() + aviso(dossie, AVISO_DOSSIE_CHARS, 'dossie.md'));
      }
    }
    if (temMemoria) parts.push(nucleoMemoria(root, meta.cliente));
    const pecas = summarizePecas(meta.pecas);
    parts.push('## Peças\n' + (pecas ?? '(plano de peças não feito — coletar posts, tipos, cenário dos stories e textos: skill ps-pauta)'));
    const state = summarizeState(readJson(path.join(dir, 'estado.json')));
    if (state) parts.push('## Estado em cache\n' + state);
    parts.push('Confirme com o usuário qual peça está aberta no Photoshop antes da próxima etapa. Assunto de outra pauta → lembrar de abrir uma sessão nova.');
  } else {
    if (temMemoria) parts.push(nucleoMemoria(root, ''));
    const abertas = openPautas(pautasDir).slice(0, MAX_PAUTAS);
    const lista = abertas.length
      ? abertas.map((m) => `- ${m.slug}: ${m.nome}${m.cliente ? ` [${m.cliente}]` : ''}`).join('\n')
      : '(nenhuma pauta aberta)';
    parts.push(`## Sessão sem pauta\nPautas abertas:\n${lista}\n\nAntes de trabalhar, pergunte ao usuário qual pauta seguir ou se é uma nova (skill ps-pauta). Uma sessão = uma pauta.`);
  }
  return parts.join('\n\n') + '\n';
}

const sessaoArg = process.argv.indexOf('--sessao');
if (require.main === module && sessaoArg > 0) {
  const root = process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..');
  process.stdout.write(build(root, { session_id: process.argv[sessaoArg + 1] }));
} else if (require.main === module) {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let input = {};
    try {
      input = JSON.parse(buf || '{}');
    } catch {}
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    if (input.source === 'compact' && input.session_id) {
      fs.rmSync(path.join(root, 'workspace', 'memoria', 'injetados', `${String(input.session_id).replace(/[^\w-]/g, '_')}.json`), { force: true });
    }
    process.stdout.write(build(root, input));
  });
}

module.exports = { build, summarizeState, summarizePecas };
