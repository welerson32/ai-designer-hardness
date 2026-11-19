import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LOCK = JSON.parse(readFileSync(join(ROOT, 'setup', 'adb-mcp.lock.json'), 'utf8'));
export const VENDOR = join(ROOT, 'vendor', 'adb-mcp');
export const MCP_DIR = join(VENDOR, 'mcp');
export const PROXY_DIR = join(VENDOR, 'adb-proxy-socket');
export const PROXY_LOG = join(ROOT, 'vendor', 'proxy.log');
export const UPIA = 'C:\\Program Files\\Common Files\\Adobe\\Adobe Desktop Common\\RemoteComponents\\UPI\\UnifiedPluginInstallerAgent\\UnifiedPluginInstallerAgent.exe';

export function run(cmd, args = [], opts = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
      windowsHide: true,
      ...opts,
    }).trim();
  } catch {
    return null;
  }
}

export function findUv() {
  if (run('uv', ['--version'])) return 'uv';
  const candidates = [
    join(homedir(), '.local', 'bin', 'uv.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', 'uv.exe'),
    join(homedir(), '.cargo', 'bin', 'uv.exe'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function vendorCommit() {
  return run('git', ['-C', VENDOR, 'rev-parse', 'HEAD']);
}

export function photoshopAno() {
  const base = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Adobe');
  let anos = [];
  try {
    anos = readdirSync(base)
      .map((d) => d.match(/^Adobe Photoshop (\d{4})$/))
      .filter(Boolean)
      .filter((m) => existsSync(join(base, m[0], 'Photoshop.exe')))
      .map((m) => Number(m[1]));
  } catch {
    return null;
  }
  return anos.length ? Math.max(...anos) : null;
}

export function photoshopAberto() {
  const out = run('tasklist', ['/FI', 'IMAGENAME eq Photoshop.exe', '/NH']);
  return Boolean(out && /Photoshop\.exe/i.test(out));
}

export function portaAberta(port = LOCK.proxyPorta, host = '127.0.0.1', ms = 800) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    const done = (ok) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(ms, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

export function sondarPlugin(uv) {
  const out = run(uv, ['run', '--directory', MCP_DIR, '--no-sync', 'python', join(ROOT, 'scripts', 'setup', 'probe_ps.py')], { timeout: 25000 });
  if (!out) return 'ERRO';
  const last = out.split(/\r?\n/).pop();
  return ['OK', 'SEM_PLUGIN', 'SEM_PROXY'].find((k) => last.startsWith(k)) ?? 'ERRO';
}

export const PY_MODULOS = ['mcp', 'socketio', 'numpy', 'PIL', 'fontTools', 'requests', 'websocket'];

export function pythonPronto() {
  const py = join(MCP_DIR, '.venv', 'Scripts', 'python.exe');
  if (!existsSync(py)) return { ok: false, msg: 'ambiente Python do adb-mcp não criado' };
  const out = run(py, ['-c', `import ${PY_MODULOS.join(', ')}; print('ok')`], { timeout: 30000 });
  return out === 'ok'
    ? { ok: true, msg: 'ambiente Python do adb-mcp com todas as bibliotecas' }
    : { ok: false, msg: 'ambiente Python incompleto (instalação parou no meio)' };
}
