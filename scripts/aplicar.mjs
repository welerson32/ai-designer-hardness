#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, loadRecipe } from './recipe.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROXY_URL = 'http://localhost:3001';
const APP = 'photoshop';
const ACOES = JSON.parse(readFileSync(join(ROOT, 'scripts', 'acoes-ps.json'), 'utf8')).tools;
const SO_MCP = new Set(['get_layers', 'get_layer_image', 'get_document_image', 'save_document_image_as_png', 'generate_image', 'generative_fill', 'harmonize_layer', 'export_layers_as_png']);
const MAX_RESPOSTA = 4000;

export function comandoDaTool(nome, args = {}) {
  if (SO_MCP.has(nome)) throw new Error(`${nome}: imagem ou crédito Firefly — use a tool do MCP, com aprovação`);
  const def = ACOES[nome];
  if (!def) throw new Error(`tool sem mapeamento: ${nome} (ver scripts/acoes-ps.json)`);
  const valores = { ...(def.defaults ?? {}), ...args };
  const options = { ...(def.fixed ?? {}) };
  for (const [opt, arg] of Object.entries(def.options)) {
    if (!(arg in valores)) throw new Error(`${nome}: parâmetro ausente "${arg}"`);
    options[opt] = valores[arg];
  }
  return { application: APP, action: def.action, options, ...(def.falsoErro ? { falsoErro: def.falsoErro } : {}) };
}

const batchPlay = (descriptor) => ({ application: APP, action: 'executeBatchPlayCommand', options: { commands: [descriptor] } });
const semMeta = ({ falsoErro, ...c }) => c;

export function comandosDaReceita(nome, params = {}) {
  const { falsoErro } = loadRecipe(nome);
  return render(nome, params).map((d) => ({ ...batchPlay(d), ...(falsoErro ? { falsoErro } : {}) }));
}

const TIPOS = { 1: 'pixel', 2: 'ajuste', 3: 'texto', 4: 'vetor', 5: 'smartObject', 6: 'video', 7: 'grupo', 9: 'gradiente', 10: 'padrao', 11: 'corSolida', 12: 'fundo' };
const TIPO_ALIAS = { text: 'texto', group: 'grupo', solidColor: 'corSolida', background: 'fundo', adjustment: 'ajuste', vector: 'vetor' };

export function filtrarCamadas(lista, { nome, tipo, prancheta } = {}) {
  const t = tipo ? TIPO_ALIAS[tipo] ?? tipo : null;
  return (Array.isArray(lista) ? lista : [])
    .filter((l) => l.layerKind !== 13)
    .map((l) => ({ id: l.layerID, nome: l.name, tipo: TIPOS[l.layerKind] ?? String(l.layerKind), pai: l.parentLayerID ?? null, visivel: l.visible !== false, bounds: boundsDe(l) }))
    .filter((l) => (!nome || l.nome === nome) && (!t || l.tipo === t) && (prancheta === undefined || l.pai === Number(prancheta)));
}

export function fontesFaltando(resposta, pedidas) {
  const fl = resposta?.fontList ?? resposta;
  const nomes = new Set([...(fl?.fontPostScriptName ?? []), ...(fl?.fontName ?? [])].map((n) => String(n).toLowerCase()));
  return pedidas.filter((f) => !nomes.has(String(f).toLowerCase()));
}

export function planejar(lote) {
  if (!lote?.name || !Array.isArray(lote.steps)) throw new Error('lote precisa de "name" e "steps"');
  const passos = [];
  const snapshot = lote.snapshot !== false ? `lote:${lote.name}` : null;
  if (snapshot) for (const c of render('history-snapshot', { name: snapshot })) passos.push({ passo: 'snapshot', comando: batchPlay(c) });
  lote.steps.forEach((s, i) => {
    const rotulo = `${i + 1}:${s.recipe ?? s.tool}`;
    if (s.recipe) for (const c of comandosDaReceita(s.recipe, s.params ?? {})) passos.push({ passo: rotulo, comando: c });
    else if (s.tool) passos.push({ passo: rotulo, comando: comandoDaTool(s.tool, s.args ?? {}) });
    else throw new Error(`step ${i + 1}: precisa de "recipe" ou "tool"`);
  });
  return { passos, snapshot };
}

export function erroDoPacote(p) {
  if (!p) return 'sem resposta do Photoshop';
  if (p.status !== 'SUCCESS') return p.message ?? 'FAILURE sem mensagem';
  const r = p.response;
  if (r && typeof r === 'object' && r._obj === 'error') return `${r.message ?? 'erro do Photoshop'} (código ${r.result ?? '?'})`;
  return null;
}

export function docCompacto(d) {
  if (!d || typeof d !== 'object') return null;
  const pick = ['id', 'name', 'title', 'width', 'height', 'resolution', 'path', 'saved'];
  return Object.fromEntries(pick.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]));
}

export function enxugar(valor, limite = MAX_RESPOSTA) {
  if (valor === undefined) return undefined;
  const s = JSON.stringify(valor);
  return s.length <= limite ? valor : `${s.slice(0, limite)}… [+${s.length - limite} caracteres]`;
}

const px = (v) => (v && typeof v === 'object' && '_value' in v ? v._value : v);

export function boundsDe(resposta) {
  const b = resposta?.boundsNoEffects ?? resposta?.bounds;
  if (!b) return null;
  return { left: px(b.left), top: px(b.top), right: px(b.right), bottom: px(b.bottom) };
}

export async function executarLote(lote, enviar, { conferirExpect = true } = {}) {
  const { passos, snapshot } = planejar(lote);
  let ultimo = null;
  const avisos = [];
  for (let i = 0; i < passos.length; i++) {
    let pacote;
    try {
      pacote = await enviar(semMeta(passos[i].comando));
    } catch (e) {
      pacote = { status: 'FAILURE', message: e.message };
    }
    let erro = erroDoPacote(pacote);
    const { falsoErro } = passos[i].comando;
    if (erro && falsoErro && erro.includes(falsoErro)) {
      avisos.push(`${passos[i].passo}: erro conhecido ignorado (${erro})`);
      erro = null;
    }
    if (erro) {
      let rollback = 'não necessário';
      if (snapshot && i > 0) {
        try {
          const r = await enviar(batchPlay(render('revert-snapshot', { name: snapshot })[0]));
          rollback = erroDoPacote(r) ? `falhou: ${erroDoPacote(r)}` : 'feito';
        } catch (e) {
          rollback = `falhou: ${e.message}`;
        }
      }
      return { status: 'ERRO', lote: lote.name, chamadas: `${i}/${passos.length}`, falha: { indice: i + 1, passo: passos[i].passo, mensagem: erro }, rollback, doc: docCompacto(ultimo?.document) };
    }
    ultimo = pacote;
  }
  const out = { status: 'OK', lote: lote.name, chamadas: `${passos.length}/${passos.length}`, doc: docCompacto(ultimo?.document), ...(avisos.length ? { avisos } : {}) };
  if (conferirExpect && Array.isArray(lote.expect) && lote.expect.length) {
    out.expect = [];
    for (const e of lote.expect) {
      if (!e.layerId || !e.bounds) continue;
      const p = await enviar(batchPlay({ _obj: 'get', _target: [{ _property: 'boundsNoEffects' }, { _ref: 'layer', _id: e.layerId }] })).catch(() => null);
      const real = erroDoPacote(p) ? null : boundsDe(p.response);
      const ok = Boolean(real) && ['left', 'top', 'right', 'bottom'].every((k) => Math.abs(Number(real[k]) - Number(e.bounds[k])) <= 1);
      out.expect.push(ok ? { layerId: e.layerId, ok } : { layerId: e.layerId, ok, esperado: e.bounds, real });
    }
    if (out.expect.some((x) => !x.ok)) out.status = 'OK_COM_DIVERGENCIA';
  }
  return out;
}

export async function conectar({ url = PROXY_URL, timeout = 20000 } = {}) {
  const dir = process.env.ADB_PROXY_DIR || join(ROOT, 'vendor', 'adb-mcp', 'adb-proxy-socket');
  if (!existsSync(join(dir, 'node_modules', 'socket.io-client'))) throw new Error('conexão indisponível: dependências do proxy ausentes (ps-setup)');
  const { io } = createRequire(join(dir, 'package.json'))('socket.io-client');
  const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 5000 });
  await new Promise((ok, falha) => {
    socket.once('connect', ok);
    socket.once('connect_error', (e) => falha(new Error(`conexão com o Photoshop indisponível (proxy ${url}): ${e.message}`)));
  });
  const enviar = (command) => new Promise((ok, falha) => {
    const t = setTimeout(() => {
      socket.off('packet_response', resp);
      falha(new Error(`sem resposta em ${timeout / 1000}s (Photoshop ocupado ou painel do plugin desconectado)`));
    }, timeout);
    const resp = (pacote) => {
      clearTimeout(t);
      ok(pacote);
    };
    socket.once('packet_response', resp);
    socket.emit('command_packet', { type: 'command', application: APP, command });
  });
  return { enviar, fechar: () => socket.disconnect() };
}

function parseKv(lista) {
  return Object.fromEntries(lista.map((kv) => {
    const i = kv.indexOf('=');
    if (i < 1) throw new Error(`parâmetro inválido: ${kv}`);
    const v = kv.slice(i + 1);
    return [kv.slice(0, i), v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v];
  }));
}

const USAGE = `uso:
  node scripts/aplicar.mjs <pauta>/etapas/<lote>.json [--sem-expect] [--timeout 20]
      aplica o lote comando a comando, para no 1º erro, desfaz pelo snapshot e confere o expect
  node scripts/aplicar.mjs --receita <nome> k=v ...     uma receita avulsa (leitura ou escrita), devolve a resposta
  node scripts/aplicar.mjs --tool <nome> '<args json>'  uma tool avulsa (ex.: get_document_info '{}')
  node scripts/aplicar.mjs --camadas [nome=<exato>] [tipo=texto|pixel|grupo|smartObject|corSolida|fundo] [prancheta=<id>]
      busca camadas e devolve só as que casam (id, nome, tipo, pai, visível, bounds)
  node scripts/aplicar.mjs --fontes nomes=<PostScript1>,<PostScript2>   fontes que NÃO estão instaladas
  [--max N] corta respostas avulsas em N caracteres (padrão: completa, sem a árvore de camadas)
saída: JSON enxuto — nunca a árvore de camadas que o Photoshop anexa a cada resposta.`;

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const ti = argv.indexOf('--timeout');
  const timeout = ti >= 0 ? Number(argv[ti + 1]) * 1000 : 20000;
  let conexao = null;
  try {
    if (!argv.length || argv[0] === '-h' || argv[0] === '--help') throw new Error(USAGE);
    let saida;
    if (argv[0] === '--camadas' || argv[0] === '--fontes') {
      const kv = parseKv(argv.slice(1).filter((a, i, l) => !a.startsWith('--') && !l[i - 1]?.startsWith('--timeout')));
      conexao = await conectar({ timeout });
      const receita = argv[0] === '--camadas' ? 'layers-index' : 'font-list';
      const p = await conexao.enviar(semMeta(comandosDaReceita(receita)[0]));
      const erro = erroDoPacote(p);
      if (erro) throw new Error(erro);
      saida = argv[0] === '--camadas'
        ? { status: 'OK', camadas: filtrarCamadas(p.response?.list, kv), doc: docCompacto(p.document) }
        : { status: 'OK', faltando: fontesFaltando(p.response, String(kv.nomes ?? '').split(',').map((x) => x.trim()).filter(Boolean)) };
    } else if (argv[0] === '--receita' || argv[0] === '--tool') {
      const avulsos = argv[0] === '--receita'
        ? comandosDaReceita(argv[1], parseKv(argv.slice(2).filter((a, i, l) => a !== '--timeout' && l[i - 1] !== '--timeout')))
        : [comandoDaTool(argv[1], JSON.parse(argv[2] ?? '{}'))];
      conexao = await conectar({ timeout });
      const respostas = [];
      let doc = null;
      for (const c of avulsos) {
        const p = await conexao.enviar(semMeta(c));
        const erro = erroDoPacote(p);
        if (erro && !(c.falsoErro && erro.includes(c.falsoErro))) throw new Error(erro);
        respostas.push(argv.includes('--max') ? enxugar(p.response, Number(argv[argv.indexOf('--max') + 1])) : p.response);
        doc = docCompacto(p.document);
      }
      saida = { status: 'OK', resposta: respostas.length === 1 ? respostas[0] : respostas, doc };
    } else {
      const lote = JSON.parse(readFileSync(argv[0], 'utf8'));
      planejar(lote);
      conexao = await conectar({ timeout });
      saida = await executarLote(lote, conexao.enviar, { conferirExpect: !argv.includes('--sem-expect') });
    }
    process.stdout.write(JSON.stringify(saida) + '\n');
    if (saida.status === 'ERRO') process.exitCode = 1;
  } catch (e) {
    process.stdout.write(JSON.stringify({ status: 'ERRO', mensagem: e.message }) + '\n');
    process.exitCode = 1;
  } finally {
    conexao?.fechar();
  }
}
