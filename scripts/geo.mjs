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

export function center({ W, H, bounds, axis = 'both' }) {
  const b = parseBounds(bounds);
  const out = { dx: 0, dy: 0 };
  if (axis !== 'y') out.dx = round((num(W, 'W') - b.w) / 2 - b.left);
  if (axis !== 'x') out.dy = round((num(H, 'H') - b.h) / 2 - b.top);
  return out;
}

export function align({ W, H, bounds, edge, margin = 0 }) {
  const b = parseBounds(bounds);
  const m = num(margin, 'margin');
  switch (edge) {
    case 'left': return { dx: round(m - b.left), dy: 0 };
    case 'right': return { dx: round(num(W, 'W') - m - b.right), dy: 0 };
    case 'top': return { dx: 0, dy: round(m - b.top) };
    case 'bottom': return { dx: 0, dy: round(num(H, 'H') - m - b.bottom) };
    default: throw new Error('--edge deve ser left|right|top|bottom');
  }
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

const OPS = { center, align, 'move-to': moveTo, grid, distribute };

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
  center     --W --H --bounds l,t,r,b [--axis x|y|both]   -> {dx,dy}
  align      --W --H --bounds l,t,r,b --edge left|right|top|bottom [--margin]   -> {dx,dy}
  move-to    --bounds l,t,r,b [--x] [--y]                  -> {dx,dy}
  grid       --W --cols [--gutter] [--margin]              -> {col,xs}
  distribute --start --end --sizes s1,s2,...               -> {gap,positions}
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
