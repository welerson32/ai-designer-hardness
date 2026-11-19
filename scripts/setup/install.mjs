#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, LOCK, VENDOR, MCP_DIR, PROXY_DIR, UPIA, run, findUv, vendorCommit, portaAberta } from './lib.mjs';
import { iniciarProxy } from './doctor.mjs';

const LONGO = { timeout: 600000 };

export function pacotePlugin() {
  return [LOCK.plugin.ccxMantenedor, LOCK.plugin.ccxUsuario].map((p) => join(ROOT, p)).find((p) => existsSync(p)) ?? null;
}
const resultado = (passo, ok, msg) => ({ passo, ok, msg });

function winget(id) {
  return run('winget', ['install', '--id', id, '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements'], LONGO);
}

const PASSOS = {
  uv() {
    if (findUv()) return resultado('uv', true, 'já instalado');
    winget('astral-sh.uv');
    if (findUv()) return resultado('uv', true, 'instalado via winget');
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://astral.sh/uv/install.ps1 | iex'], LONGO);
    return findUv() ? resultado('uv', true, 'instalado via instalador oficial') : resultado('uv', false, 'falhou ao instalar uv');
  },

  vendor() {
    if (!existsSync(VENDOR)) {
      mkdirSync(join(ROOT, 'vendor'), { recursive: true });
      if (run('git', ['clone', '--filter=blob:none', LOCK.repo, VENDOR], LONGO) === null) return resultado('vendor', false, 'falhou ao baixar o adb-mcp');
    }
    if (vendorCommit() !== LOCK.commit) {
      run('git', ['-C', VENDOR, 'fetch', '--quiet', 'origin'], LONGO);
      if (run('git', ['-C', VENDOR, 'checkout', '--quiet', '--force', LOCK.commit], LONGO) === null) return resultado('vendor', false, `falhou ao fixar a versão ${LOCK.commit.slice(0, 7)}`);
    }
    return resultado('vendor', vendorCommit() === LOCK.commit, `adb-mcp em ${LOCK.commit.slice(0, 7)}`);
  },

  python() {
    const uv = findUv();
    if (!uv) return resultado('python', false, 'uv ausente (rode o passo uv)');
    const out = run(uv, ['sync', '--directory', MCP_DIR, '--no-install-project'], LONGO);
    return resultado('python', out !== null && existsSync(join(MCP_DIR, '.venv')), 'ambiente Python do adb-mcp');
  },

  'proxy-deps'() {
    const out = run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { ...LONGO, cwd: PROXY_DIR, shell: true });
    return resultado('proxy-deps', out !== null && existsSync(join(PROXY_DIR, 'node_modules', 'socket.io')), 'dependências do proxy');
  },

  async proxy() {
    if (await portaAberta()) return resultado('proxy', true, 'já rodando');
    iniciarProxy();
    await new Promise((r) => setTimeout(r, 2000));
    return resultado('proxy', await portaAberta(), `proxy na porta ${LOCK.proxyPorta}`);
  },

  'plugin-pasta'() {
    mkdirSync(join(ROOT, 'vendor', 'plugin'), { recursive: true });
    return resultado('plugin-pasta', true, join(ROOT, 'vendor', 'plugin'));
  },

  plugin() {
    const ccx = pacotePlugin();
    if (!ccx) return resultado('plugin', false, 'SEM_PACOTE: gerar pelo UXP Developer Tool (etapa guiada do ps-setup)');
    if (!existsSync(UPIA)) return resultado('plugin', false, `SEM_INSTALADOR: instalar com duplo clique em ${ccx}`);
    const out = run(UPIA, ['/install', ccx], LONGO);
    return resultado('plugin', out !== null, out ?? `FALHOU: instalar com duplo clique em ${ccx}`);
  },

  workspace() {
    for (const d of ['workspace/pautas', 'workspace/clientes']) mkdirSync(join(ROOT, d), { recursive: true });
    return resultado('workspace', true, 'pastas criadas');
  },
};

const ORDEM = ['uv', 'vendor', 'python', 'proxy-deps', 'plugin-pasta', 'workspace', 'proxy'];

export async function instalar(passos) {
  const lista = passos.includes('tudo') ? ORDEM : passos;
  const out = [];
  for (const p of lista) {
    if (!PASSOS[p]) {
      out.push(resultado(p, false, 'passo desconhecido'));
      break;
    }
    const r = await PASSOS[p]();
    out.push(r);
    if (!r.ok) break;
  }
  return out;
}

const USAGE = `uso: node scripts/setup/install.mjs <passo...|tudo>
passos: ${Object.keys(PASSOS).join(', ')}
"tudo" = ${ORDEM.join(' → ')} (o plugin é separado: exige o Photoshop instalado)`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const passos = process.argv.slice(2);
  if (passos.length === 0) {
    process.stderr.write(USAGE + '\n');
    process.exit(1);
  }
  const r = await instalar(passos);
  process.stdout.write(JSON.stringify({ ok: r.every((x) => x.ok), passos: r }) + '\n');
  if (!r.every((x) => x.ok)) process.exit(1);
}
