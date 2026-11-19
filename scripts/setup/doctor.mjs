#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT, LOCK, VENDOR, MCP_DIR, PROXY_DIR, PROXY_LOG,
  run, findUv, vendorCommit, photoshopAno, photoshopAberto, portaAberta, sondarPlugin,
} from './lib.mjs';

const NODE_MIN = 18;

const item = (id, ok, tipo, msg) => ({ id, ok, tipo, msg });

export async function diagnosticar({ sondar = true } = {}) {
  const r = [];
  const nodeMaior = Number(process.versions.node.split('.')[0]);
  r.push(item('node', nodeMaior >= NODE_MIN, 'auto', `Node ${process.versions.node} (mín. ${NODE_MIN})`));
  r.push(item('git', Boolean(run('git', ['--version'])), 'auto', 'Git'));

  const uv = findUv();
  r.push(item('uv', Boolean(uv), 'auto', uv ? `uv em ${uv}` : 'uv ausente'));

  const commit = existsSync(VENDOR) ? vendorCommit() : null;
  r.push(item('vendor', commit === LOCK.commit, 'auto', commit ? `adb-mcp em ${commit.slice(0, 7)} (esperado ${LOCK.commit.slice(0, 7)})` : 'adb-mcp não baixado'));

  r.push(item('python', existsSync(join(MCP_DIR, '.venv')), 'auto', 'ambiente Python do adb-mcp'));
  r.push(item('proxy-deps', existsSync(join(PROXY_DIR, 'node_modules', 'socket.io')), 'auto', 'dependências do proxy'));
  r.push(item('workspace', existsSync(join(ROOT, 'workspace')), 'auto', 'pasta workspace/'));

  const ano = photoshopAno();
  r.push(item('photoshop', Boolean(ano && ano >= LOCK.photoshopMinAno), 'guiado', ano ? `Photoshop ${ano} (mín. ${LOCK.photoshopMinAno})` : 'Photoshop não encontrado'));

  const pacote = [LOCK.plugin.ccxMantenedor, LOCK.plugin.ccxUsuario].find((p) => existsSync(join(ROOT, p)));
  r.push(item('plugin-pacote', Boolean(pacote), 'guiado', pacote ? `pacote do plugin em ${pacote}` : 'pacote do plugin ausente (gerar pelo UXP Developer Tool)'));

  const proxy = await portaAberta();
  r.push(item('proxy', proxy, 'auto', `proxy na porta ${LOCK.proxyPorta}`));

  const aberto = photoshopAberto();
  r.push(item('photoshop-aberto', aberto, 'guiado', 'Photoshop aberto'));

  if (sondar && uv && proxy && aberto && r.find((x) => x.id === 'python').ok) {
    const s = sondarPlugin(uv);
    r.push(item('plugin-conectado', s === 'OK', 'guiado', s === 'OK' ? 'plugin respondeu' : s === 'SEM_PLUGIN' ? 'plugin não respondeu (desconectado ou não instalado)' : 'erro ao testar conexão'));
  } else {
    r.push(item('plugin-conectado', false, 'guiado', 'não testado (depende de proxy, Python e Photoshop aberto)'));
  }
  return r;
}

export function iniciarProxy() {
  mkdirSync(join(ROOT, 'vendor'), { recursive: true });
  const log = openSync(PROXY_LOG, 'a');
  const child = spawn(process.execPath, [join(PROXY_DIR, 'proxy.js')], {
    cwd: PROXY_DIR,
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

const espera = (ms) => new Promise((res) => setTimeout(res, ms));

async function modoHook() {
  let r = await diagnosticar({ sondar: false });
  const depsOk = ['vendor', 'proxy-deps'].every((id) => r.find((x) => x.id === id).ok);
  if (depsOk && !r.find((x) => x.id === 'proxy').ok) {
    iniciarProxy();
    await espera(1500);
  }
  r = await diagnosticar({ sondar: true });

  const essenciais = r.filter((x) => !['photoshop-aberto', 'plugin-conectado', 'plugin-pacote'].includes(x.id));
  const falhas = essenciais.filter((x) => !x.ok);
  const ps = r.find((x) => x.id === 'photoshop-aberto');
  const plugin = r.find((x) => x.id === 'plugin-conectado');

  const linhas = ['# Checagem do ambiente (hook doctor)'];
  if (falhas.length === 0) {
    linhas.push('Instalação: OK.');
  } else {
    linhas.push('Instalação: PROBLEMAS — acione a skill ps-setup antes de qualquer trabalho:');
    for (const f of falhas) linhas.push(`- ${f.id} [${f.tipo}]: ${f.msg}`);
  }
  if (!ps.ok) linhas.push('Photoshop: fechado. Quando a pessoa for trabalhar na arte, peça para abrir o Photoshop.');
  else if (!plugin.ok) linhas.push(`Photoshop aberto, conexão: ${plugin.msg}. Acione a skill ps-setup (etapa de conexão) antes de mexer na arte.`);
  else linhas.push('Photoshop: aberto e conectado.');
  return linhas.join('\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--hook')) {
      process.stdout.write(await modoHook());
    } else {
      const r = await diagnosticar({ sondar: !args.includes('--rapido') });
      process.stdout.write(JSON.stringify({ ok: r.every((x) => x.ok), itens: r }) + '\n');
    }
  } catch (e) {
    process.stdout.write(`# Checagem do ambiente falhou: ${e.message}. Acione a skill ps-setup.\n`);
  }
}
