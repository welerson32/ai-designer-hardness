#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function git(args, timeout = 20000) {
  const r = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    windowsHide: true,
  });
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? r.error?.message ?? '').trim() };
}

export function atualizar() {
  if (!git(['rev-parse', '--is-inside-work-tree']).ok) return { status: 'sem-git' };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).out;
  if (!git(['rev-parse', '--abbrev-ref', '@{u}']).ok) return { status: 'sem-remoto', branch };
  const fetch = git(['fetch', '--quiet']);
  if (!fetch.ok) return { status: 'offline', branch, detalhe: fetch.err.split('\n')[0] };
  const atras = Number(git(['rev-list', '--count', 'HEAD..@{u}']).out || 0);
  if (!atras) return { status: 'em-dia', branch };
  const sujo = git(['status', '--porcelain', '--untracked-files=no']).out;
  if (sujo) return { status: 'alteracoes-locais', branch, atras, detalhe: sujo.split('\n').slice(0, 5).join('; ') };
  const pull = git(['pull', '--ff-only', '--quiet'], 60000);
  if (!pull.ok) return { status: 'falhou', branch, atras, detalhe: pull.err.split('\n')[0] };
  const log = git(['log', '--oneline', `-${Math.min(atras, 10)}`]).out;
  return { status: 'atualizado', branch, atras, log };
}

function mensagem(r) {
  switch (r.status) {
    case 'atualizado':
      return `# Atualização do harness (hook atualizar)\nHarness atualizado agora: ${r.atras} mudança(s) em ${r.branch}.\n${r.log}\nAs instruções do projeto podem ter mudado depois que esta sessão carregou: releia CLAUDE.md antes de trabalhar. Mudança de settings (modelo, permissões, hooks) só vale na próxima conversa — se o log citar settings, sugira ao usuário abrir conversa nova. Os dados do designer (workspace/) não são tocados pela atualização.`;
    case 'alteracoes-locais':
      return `# Atualização do harness (hook atualizar)\nHá ${r.atras} atualização(ões) do harness, mas NÃO apliquei: existem arquivos do harness alterados nesta máquina (${r.detalhe}). Não mexa neles; avise o usuário numa linha que há atualização pendente e que o responsável pelo harness precisa olhar este computador.`;
    case 'falhou':
      return `# Atualização do harness (hook atualizar)\nFalha ao aplicar ${r.atras} atualização(ões): ${r.detalhe}. Siga com a versão atual e avise o usuário numa linha que o responsável pelo harness precisa olhar.`;
    default:
      return '';
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const r = atualizar();
  if (process.argv.includes('--hook')) {
    const m = mensagem(r);
    if (m) process.stdout.write(m + '\n');
  } else {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  }
}
