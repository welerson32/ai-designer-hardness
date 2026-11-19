#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { carrossel } from './geo.mjs';

const TIPOS = { jpg: 'JPG', png: 'PNG' };

export function loteExportacao({ slug, saida, doc, W, H, folhas, tipo = 'jpg', nome = '90-exportar-folhas' }) {
  if (!slug || !saida || doc === undefined) throw new Error('--slug, --saida e --doc obrigatórios');
  const docId = Number(doc);
  const ext = String(tipo).toLowerCase();
  if (!TIPOS[ext]) throw new Error('--tipo deve ser jpg ou png');
  const { folhas: lista } = carrossel({ W, H, folhas, margem: 0 });

  const steps = [];
  for (const f of lista) {
    const num = String(f.n).padStart(2, '0');
    const copia = `claude-export-${num}`;
    const [left, top, right, bottom] = f.frame.split(',').map(Number);
    steps.push(
      { recipe: 'select-document', params: { docId } },
      { recipe: 'duplicate-document', params: { name: copia } },
      { recipe: 'crop-document', params: { left, top, right, bottom } },
      { tool: 'save_document_as', args: { file_path: join(saida, `${slug}-folha-${num}.${ext}`), file_type: TIPOS[ext] } },
      { recipe: 'close-document', params: { name: copia } },
    );
  }
  steps.push({ recipe: 'select-document', params: { docId } });
  return { name: nome, steps };
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--')) throw new Error(`argumento inesperado: ${argv[i]}`);
    a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}

const USAGE = `uso: node scripts/exportar.mjs --slug <slug> --saida <pasta> --doc <doc.id do estado.json> --W <folha W> --H <folha H> --folhas N [--tipo jpg|png] --arquivo <pauta>/etapas/90-exportar-folhas.json
gera o lote que exporta cada folha do carrossel como imagem separada (aplicar com recipe.mjs --lote / ps-operator).`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const a = parseArgs(process.argv.slice(2));
    if (!a.arquivo) throw new Error(USAGE);
    const lote = loteExportacao(a);
    writeFileSync(a.arquivo, JSON.stringify(lote, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ arquivo: a.arquivo, folhas: Number(a.folhas), passos: lote.steps.length }) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
