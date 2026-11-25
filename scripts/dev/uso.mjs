#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

const USAGE = `uso: node scripts/dev/uso.mjs [--sessao <id> | --arquivo <transcript.jsonl>] [--json]
  sem argumento: última sessão deste projeto.
  soma tokens por modelo (sessão + subagentes), chamadas por ferramenta, agentes disparados e duração.`;

function projectDir(cwd = process.cwd()) {
  return join(homedir(), '.claude', 'projects', cwd.replace(/[^a-zA-Z0-9]/g, '-'));
}

function jsonlUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return jsonlUnder(p);
    return e.name.endsWith('.jsonl') ? [p] : [];
  });
}

function resolveFiles(args) {
  const i = (k) => args.indexOf(k);
  if (i('--arquivo') >= 0) {
    const f = args[i('--arquivo') + 1];
    return [f, ...jsonlUnder(f.replace(/\.jsonl$/, ''))];
  }
  const dir = projectDir();
  let id = i('--sessao') >= 0 ? args[i('--sessao') + 1] : null;
  if (!id) {
    const latest = readdirSync(dir)
      .filter((n) => n.endsWith('.jsonl'))
      .map((n) => ({ n, t: statSync(join(dir, n)).mtimeMs }))
      .sort((a, b) => b.t - a.t)[0];
    if (!latest) throw new Error(`nenhuma sessão em ${dir}`);
    id = basename(latest.n, '.jsonl');
  }
  return [join(dir, `${id}.jsonl`), ...jsonlUnder(join(dir, id))];
}

export function summarize(lines) {
  const seen = new Set();
  const models = {};
  const tools = {};
  const agents = {};
  let first = null;
  let last = null;
  let turns = 0;
  for (const e of lines) {
    if (e.timestamp) {
      const t = Date.parse(e.timestamp);
      if (!Number.isNaN(t)) {
        first = first === null ? t : Math.min(first, t);
        last = last === null ? t : Math.max(last, t);
      }
    }
    if (e.type === 'user' && !e.isSidechain && typeof e.message?.content === 'string') turns++;
    if (e.type !== 'assistant' || !e.message) continue;
    const m = e.message;
    for (const c of Array.isArray(m.content) ? m.content : []) {
      if (c.type !== 'tool_use') continue;
      tools[c.name] = (tools[c.name] ?? 0) + 1;
      if ((c.name === 'Agent' || c.name === 'Task') && c.input?.subagent_type) {
        agents[c.input.subagent_type] = (agents[c.input.subagent_type] ?? 0) + 1;
      }
      if (c.name === 'Skill' && c.input?.skill) tools[`Skill:${c.input.skill}`] = (tools[`Skill:${c.input.skill}`] ?? 0) + 1;
    }
    const key = m.id ?? e.uuid;
    if (seen.has(key) || !m.usage) continue;
    seen.add(key);
    const u = m.usage;
    const s = (models[m.model ?? '?'] ??= { requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
    s.requests++;
    s.input += u.input_tokens ?? 0;
    s.cacheWrite += u.cache_creation_input_tokens ?? 0;
    s.cacheRead += u.cache_read_input_tokens ?? 0;
    s.output += u.output_tokens ?? 0;
  }
  return { models, tools, agents, turns, minutes: first === null ? 0 : Math.round((last - first) / 600) / 100 };
}

function fmt(r, files) {
  const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const out = [`arquivos: ${files.length} (sessão + subagentes)`, `duração: ${r.minutes} min | mensagens do usuário: ${r.turns}`, '', 'modelo | req | input | cache write | cache read | output'];
  for (const [m, s] of Object.entries(r.models)) out.push(`${m} | ${s.requests} | ${k(s.input)} | ${k(s.cacheWrite)} | ${k(s.cacheRead)} | ${k(s.output)}`);
  out.push('', 'agentes: ' + (Object.entries(r.agents).map(([a, n]) => `${a}=${n}`).join(' ') || 'nenhum'));
  out.push('ferramentas:');
  for (const [t, n] of Object.entries(r.tools).sort((a, b) => b[1] - a[1])) out.push(`  ${n}x ${t}`);
  return out.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('uso.mjs')) {
  const args = process.argv.slice(2);
  try {
    if (args.includes('-h') || args.includes('--help')) throw new Error(USAGE);
    const files = resolveFiles(args).filter(existsSync);
    if (!files.length) throw new Error('transcript não encontrado\n' + USAGE);
    const lines = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return {}; }
    }));
    const r = summarize(lines);
    process.stdout.write((args.includes('--json') ? JSON.stringify({ files, ...r }, null, 2) : fmt(r, files)) + '\n');
  } catch (e) {
    process.stderr.write(e.message + '\n');
    process.exit(1);
  }
}
