import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'doctor', version: '1' } },
};

export function lerServidores(root) {
  const cfg = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
  return Object.entries(cfg.mcpServers ?? {}).map(([nome, s]) => ({ nome, command: s.command, args: s.args ?? [] }));
}

export function testarServidor({ nome, command, args }, { cwd, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    let saida = '';
    let erro = '';
    let fim = false;
    const terminar = (r) => {
      if (fim) return;
      fim = true;
      clearTimeout(timer);
      try {
        child.stdin.end();
      } catch {}
      try {
        child.kill();
      } catch {}
      resolve({ nome, ...r });
    };

    let child;
    try {
      child = spawn(command, args, { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ nome, ok: false, motivo: `não iniciou: ${e.message}` });
      return;
    }
    const timer = setTimeout(() => terminar({ ok: false, motivo: `sem resposta em ${timeoutMs / 1000}s`, stderr: erro.slice(-400) }), timeoutMs);

    child.on('error', (e) => terminar({ ok: false, motivo: e.code === 'ENOENT' ? `comando "${command}" não encontrado no PATH` : e.message }));
    child.stderr.on('data', (d) => (erro += d));
    child.stdout.on('data', (d) => {
      saida += d;
      for (const linha of saida.split('\n')) {
        try {
          const msg = JSON.parse(linha);
          if (msg.id === 1 && msg.result) return terminar({ ok: true, motivo: 'respondeu ao initialize' });
          if (msg.id === 1 && msg.error) return terminar({ ok: false, motivo: `erro no initialize: ${msg.error.message}` });
        } catch {}
      }
    });
    child.on('exit', (code) => terminar({ ok: false, motivo: `encerrou antes de responder (código ${code})`, stderr: erro.slice(-400) }));
    child.stdin.write(JSON.stringify(INIT) + '\n');
  });
}
