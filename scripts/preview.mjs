#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { fit } from './geo.mjs';
import { render } from './recipe.mjs';

const PREVIEW_NAME = 'claude-preview';

export function buildPreview({ W, H, bounds, max = 800 }) {
  const [left, top, right, bottom] = bounds
    ? String(bounds).split(',').map(Number)
    : [0, 0, Number(W), Number(H)];
  if ([left, top, right, bottom].some(Number.isNaN)) throw new Error('bounds/W/H inválidos');
  const cl = Math.max(0, left);
  const ct = Math.max(0, top);
  const cr = Math.min(Number(W), right);
  const cb = Math.min(Number(H), bottom);
  if (cr <= cl || cb <= ct) throw new Error('região fora do canvas');

  const size = fit({ w: cr - cl, h: cb - ct, max });
  const prepare = [...render('duplicate-document', { name: PREVIEW_NAME })];
  const isFull = cl === 0 && ct === 0 && cr === Number(W) && cb === Number(H);
  if (!isFull) prepare.push(...render('crop-document', { left: cl, top: ct, right: cr, bottom: cb }));
  if (size.scale < 1) prepare.push(...render('resize-image', { width: size.width, height: size.height }));

  return {
    size: { width: size.width, height: size.height },
    calls: [
      { type: 'batchPlay', commands: prepare },
      { type: 'tool', name: 'get_document_image', args: {} },
      { type: 'batchPlay', commands: render('close-document', { name: PREVIEW_NAME }) },
    ],
  };
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`argumento inesperado: ${argv[i]}`);
    a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}

const USAGE = `uso: node scripts/preview.mjs --W <canvas w> --H <canvas h> [--bounds l,t,r,b] [--max 800]
saída: { size, calls } — aplicar as chamadas na ordem; a 2ª devolve a imagem.`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.W || !args.H) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(buildPreview(args)) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
