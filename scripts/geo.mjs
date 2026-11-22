#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

const round = (n) => Math.round(n);

function parseBounds(v) {
  const p = String(v).split(',').map(Number);
  if (p.length !== 4 || p.some(Number.isNaN)) throw new Error(`bounds inválido: "${v}" (esperado l,t,r,b)`);
  const [left, top, right, bottom] = p;
  return { left, top, right, bottom, w: right - left, h: bottom - top };
}

const num = (v, name) => {
  const n = Number(v);
  if (v === undefined || Number.isNaN(n)) throw new Error(`--${name} obrigatório e numérico`);
  return n;
};

function area({ W, H, frame }) {
  if (frame !== undefined) {
    const f = parseBounds(frame);
    return { x0: f.left, y0: f.top, x1: f.right, y1: f.bottom };
  }
  return { x0: 0, y0: 0, x1: num(W, 'W'), y1: num(H, 'H') };
}

export function center({ W, H, frame, bounds, axis = 'both' }) {
  const b = parseBounds(bounds);
  const a = area({ W, H, frame });
  const out = { dx: 0, dy: 0 };
  if (axis !== 'y') out.dx = round(a.x0 + (a.x1 - a.x0 - b.w) / 2 - b.left);
  if (axis !== 'x') out.dy = round(a.y0 + (a.y1 - a.y0 - b.h) / 2 - b.top);
  return out;
}

export function align({ W, H, frame, bounds, edge, margin = 0 }) {
  const b = parseBounds(bounds);
  const a = area({ W, H, frame });
  const m = num(margin, 'margin');
  switch (edge) {
    case 'left': return { dx: round(a.x0 + m - b.left), dy: 0 };
    case 'right': return { dx: round(a.x1 - m - b.right), dy: 0 };
    case 'top': return { dx: 0, dy: round(a.y0 + m - b.top) };
    case 'bottom': return { dx: 0, dy: round(a.y1 - m - b.bottom) };
    default: throw new Error('--edge deve ser left|right|top|bottom');
  }
}

export function pranchetas({ W, H, n = 1, gap = 100, margem = 0 }) {
  const w = num(W, 'W');
  const h = num(H, 'H');
  const q = num(n, 'n');
  const g = num(gap, 'gap');
  const m = num(margem, 'margem');
  if (q < 1 || !Number.isInteger(q)) throw new Error('--n deve ser inteiro >= 1');
  return {
    canvas: { W: q * w + (q - 1) * g, H: h },
    pranchetas: Array.from({ length: q }, (_, i) => {
      const left = i * (w + g);
      return { n: i + 1, frame: `${left},0,${left + w},${h}`, conteudo: `${left + m},${m},${left + w - m},${h - m}` };
    }),
  };
}

export function moveTo({ bounds, x, y }) {
  const b = parseBounds(bounds);
  return {
    dx: x === undefined ? 0 : round(num(x, 'x') - b.left),
    dy: y === undefined ? 0 : round(num(y, 'y') - b.top),
  };
}

export function grid({ W, cols, gutter = 0, margin = 0 }) {
  const n = num(cols, 'cols');
  const g = num(gutter, 'gutter');
  const m = num(margin, 'margin');
  const col = (num(W, 'W') - 2 * m - (n - 1) * g) / n;
  if (col <= 0) throw new Error('grid não cabe no canvas');
  const xs = Array.from({ length: n }, (_, i) => round(m + i * (col + g)));
  return { col: Math.round(col * 100) / 100, xs };
}

export function distribute({ start, end, sizes }) {
  const s = String(sizes).split(',').map(Number);
  if (s.some(Number.isNaN) || s.length < 2) throw new Error('--sizes precisa de 2+ números');
  const a = num(start, 'start');
  const span = num(end, 'end') - a;
  const gap = (span - s.reduce((t, v) => t + v, 0)) / (s.length - 1);
  const positions = [];
  let cur = a;
  for (const size of s) {
    positions.push(round(cur));
    cur += size + gap;
  }
  return { gap: Math.round(gap * 100) / 100, positions };
}

export function fit({ w, h, max = 800 }) {
  const W = num(w, 'w');
  const H = num(h, 'h');
  const M = num(max, 'max');
  const k = Math.min(1, M / Math.max(W, H));
  return { width: Math.max(1, round(W * k)), height: Math.max(1, round(H * k)), scale: Math.round(k * 10000) / 10000 };
}

const OPS = { center, align, 'move-to': moveTo, grid, distribute, fit, pranchetas };

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) throw new Error(`argumento inesperado: ${k}`);
    args[k.slice(2)] = argv[++i];
  }
  return args;
}

const USAGE = `uso: node scripts/geo.mjs <op> [--chave valor]
  center     (--W --H | --frame l,t,r,b) --bounds l,t,r,b [--axis x|y|both]   -> {dx,dy}
  align      (--W --H | --frame l,t,r,b) --bounds l,t,r,b --edge left|right|top|bottom [--margin]   -> {dx,dy}
  pranchetas --W --H [--n 1] [--gap 100] [--margem]       -> {canvas,pranchetas[{n,frame,conteudo}]}
             (W,H = tamanho de UMA página; uma prancheta por página, lado a lado; --frame dela no center/align)
  move-to    --bounds l,t,r,b [--x] [--y]                  -> {dx,dy}
  grid       --W --cols [--gutter] [--margin]              -> {col,xs}
  distribute --start --end --sizes s1,s2,...               -> {gap,positions}
  fit        --w --h [--max 800]                           -> {width,height,scale} (nunca amplia)
bounds sempre sem efeitos (boundsNoEffects). dy positivo = para baixo.`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [op, ...rest] = process.argv.slice(2);
  try {
    if (!OPS[op]) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(OPS[op](parseArgs(rest))) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
