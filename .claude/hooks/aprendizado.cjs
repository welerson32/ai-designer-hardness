const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SINAIS = [
  /\bj[aá]\s+(te\s+|lhe\s+)?(falei|disse|pedi|corrigi|expliquei|ensinei|avisei)/i,
  /\b(de novo|outra vez|novamente|mais uma vez)\b/i,
  /\berrad[oa]s?\b|\berrou\b|\berrando\b/i,
  /\bn[aã]o\s+(é|e|era|foi)\s+(assim|isso|desse jeito)/i,
  /\bn[aã]o\s+(fa[cç]a|faz|coloque|coloca|use|usa|quero|gosto|pode)\b/i,
  /\b(nunca|sempre)\s+\w+/i,
  /\bcorrig/i,
  /\blembr[ae]\s+(que|de)\b/i,
  /\bprefiro\b|\bdaqui (pra|para) frente\b/i,
];

const LEMBRETE = [
  '# Lembrete do harness (hook aprendizado)',
  'A mensagem do designer parece uma correção ou um ensinamento. Antes de seguir:',
  '1. Já existe na memória (veja "Aprendizados relevantes" abaixo ou o núcleo)? → `node scripts/memoria.mjs reforcar <id> --pauta <slug>` e diga ao designer que errou algo já ensinado.',
  '2. Novo, sobre execução ou cliente → `node scripts/memoria.mjs registrar --escopo execucao|cliente:<slug> --tipo regra|conceito|preferencia --texto "<regra operacional>" --fala "<palavras literais do designer>" --termos "<sinônimos>"` (+ `--sempre` se ele disse sempre/nunca). Só desta pauta → Decisões de design do handoff.',
  '3. Confirme numa linha ("Anotado, faço assim daqui pra frente.").',
  'Não é correção (pedido normal de ajuste) → ignore este lembrete.',
].join('\n');

function detecta(prompt) {
  return typeof prompt === 'string' && SINAIS.some((r) => r.test(prompt));
}

function clienteDaSessao(root, sessionId) {
  try {
    const ws = path.join(root, 'workspace');
    const slug = JSON.parse(fs.readFileSync(path.join(ws, 'sessoes.json'), 'utf8'))[sessionId];
    if (!slug) return '';
    return JSON.parse(fs.readFileSync(path.join(ws, 'pautas', slug, 'pauta.json'), 'utf8')).cliente ?? '';
  } catch {
    return '';
  }
}

const OPERACIONAL = /^\s*(ok|okay|sim|n[aã]o|pode|segue|seguir|continua|beleza|blz|isso|feito|certo|perfeito|valeu|obrigad[oa]|aprovad[oa]|exporta|salva|manda|fecha|abre|desfaz)\b/i;

function vaiBuscar(prompt) {
  const palavras = prompt.trim().split(/\s+/).filter(Boolean);
  if (palavras.length < 5) return false;
  return !(OPERACIONAL.test(prompt) && palavras.length < 10);
}

function arquivoInjetados(root, sessionId) {
  return path.join(root, 'workspace', 'memoria', 'injetados', `${String(sessionId).replace(/[^\w-]/g, '_')}.json`);
}

function lerInjetados(root, sessionId) {
  try {
    return JSON.parse(fs.readFileSync(arquivoInjetados(root, sessionId), 'utf8'));
  } catch {
    return [];
  }
}

function gravarInjetados(root, sessionId, ids) {
  const f = arquivoInjetados(root, sessionId);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(ids));
}

function relevantes(root, prompt, cliente, sessionId) {
  if (!fs.existsSync(path.join(root, 'workspace', 'memoria', 'aprendizados.jsonl'))) return '';
  const ja = sessionId ? lerInjetados(root, sessionId) : [];
  const args = [path.join(root, 'scripts', 'memoria.mjs'), 'buscar', prompt.slice(0, 1500), '--sem-nucleo', '--k', '4', '--margem', '0.05', '--hook'];
  if (cliente) args.push('--cliente', cliente);
  if (ja.length) args.push('--excluir', ja.join(','));
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 12000, windowsHide: true });
  const out = r.status === 0 ? (r.stdout ?? '').trim() : '';
  const novos = [...out.matchAll(/^- \[(m-\d+)/gm)].map((m) => m[1]);
  if (sessionId && novos.length) gravarInjetados(root, sessionId, [...ja, ...novos]);
  return out;
}

if (require.main === module) {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let input = {};
    try {
      input = JSON.parse(buf || '{}');
    } catch {}
    const prompt = typeof input.prompt === 'string' ? input.prompt : '';
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    const parts = [];
    const correcao = detecta(prompt);
    if (correcao || vaiBuscar(prompt)) {
      const mem = relevantes(root, prompt, clienteDaSessao(root, input.session_id), input.session_id);
      if (mem) parts.push(mem);
    }
    if (correcao) parts.push(LEMBRETE);
    if (parts.length) process.stdout.write(parts.join('\n\n') + '\n');
  });
}

module.exports = { detecta, vaiBuscar, LEMBRETE, clienteDaSessao, arquivoInjetados };
