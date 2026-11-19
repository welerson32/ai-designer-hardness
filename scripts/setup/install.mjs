#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, LOCK, VENDOR, MCP_DIR, PROXY_DIR, UPIA, run, findUv, vendorCommit, portaAberta } from './lib.mjs';
import { iniciarProxy } from './doctor.mjs';

const LONGO = { timeout: 600000 };

export function empacotarPlugin() {
  const fonte = join(ROOT, LOCK.plugin.fonte);
  if (!existsSync(join(fonte, 'manifest.json'))) return { ok: false, msg: 'código do plugin ausente (rode o passo vendor)' };
  const destino = join(ROOT, LOCK.plugin.ccxGerado);
  const zip = destino.replace(/\.ccx$/, '.zip');
  for (const f of [zip, destino]) if (existsSync(f)) rmSync(f);
  const entradas = readdirSync(fonte).filter((n) => !n.startsWith('.'));
  const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
  if (run(tar, ['-a', '-c', '-f', zip, '-C', fonte, ...entradas], LONGO) === null || !existsSync(zip)) {
    return { ok: false, msg: 'falhou ao empacotar o plugin (tar)' };
  }
  renameSync(zip, destino);
  return { ok: true, msg: `plugin empacotado em ${LOCK.plugin.ccxGerado}` };
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

  'plugin-pacote'() {
    const manual = join(ROOT, LOCK.plugin.ccxManual);
    if (existsSync(manual)) return resultado('plugin-pacote', true, `usando pacote manual ${LOCK.plugin.ccxManual}`);
    const r = empacotarPlugin();
    return resultado('plugin-pacote', r.ok, r.msg);
  },

  plugin() {
    const manual = join(ROOT, LOCK.plugin.ccxManual);
    let ccx = existsSync(manual) ? manual : join(ROOT, LOCK.plugin.ccxGerado);
    if (!existsSync(ccx)) {
      const r = empacotarPlugin();
      if (!r.ok) return resultado('plugin', false, r.msg);
      ccx = join(ROOT, LOCK.plugin.ccxGerado);
    }
    if (!existsSync(UPIA)) return resultado('plugin', false, `instalador da Adobe não encontrado — instalar com duplo clique em ${ccx}`);
    const out = run(UPIA, ['/install', ccx], LONGO);
    return resultado('plugin', out !== null, out ?? `instalador da Adobe retornou erro — instalar com duplo clique em ${ccx}`);
  },

  workspace() {
    for (const d of ['workspace/pautas', 'workspace/clientes']) mkdirSync(join(ROOT, d), { recursive: true });
    return resultado('workspace', true, 'pastas criadas');
  },
};

const ORDEM = ['uv', 'vendor', 'python', 'proxy-deps', 'plugin-pacote', 'workspace', 'proxy'];

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
