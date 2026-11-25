#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { obter } from './pecas.mjs';
import { paths } from './pauta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = { jpg: 'JPG', png: 'PNG' };

export function nomeArquivo(peca, prancheta, ext) {
  return peca.pranchetas.length === 1 ? `${peca.id}.${ext}` : `${peca.id}-${prancheta.nome}.${ext}`;
}

export function loteExportacao({ saida, doc, peca, tipo = 'jpg' }) {
  if (!saida || doc === undefined || !peca) throw new Error('saida, --doc e peça obrigatórios');
  const docId = Number(doc);
  const ext = String(tipo).toLowerCase();
  if (!TIPOS[ext]) throw new Error('--tipo deve ser jpg ou png');

  const steps = [];
  peca.pranchetas.forEach((p, i) => {
    const copia = `claude-export-${peca.id}-${String(i + 1).padStart(2, '0')}`;
    const [left, top, right, bottom] = p.frame.split(',').map(Number);
    steps.push(
      { recipe: 'select-document', params: { docId } },
      { recipe: 'duplicate-document', params: { name: copia } },
      { recipe: 'crop-document', params: { left, top, right, bottom } },
      { tool: 'save_document_as', args: { file_path: join(saida, nomeArquivo(peca, p, ext)), file_type: TIPOS[ext] } },
      { recipe: 'close-document', params: { name: copia } },
    );
  });
  steps.push({ recipe: 'select-document', params: { docId } });
  return { name: `90-exportar-${peca.id}`, steps };
}

export function gerar({ slug, peca, doc, tipo, root = ROOT }) {
  const { pauta, peca: p } = obter({ slug, peca, root });
  const lote = loteExportacao({ saida: pauta.saida, doc, peca: p, tipo });
  const arquivo = join(paths(root).pautas, slug, 'etapas', `${lote.name}.json`);
  writeFileSync(arquivo, JSON.stringify(lote, null, 2) + '\n');
  return { arquivo, peca: p.id, imagens: p.pranchetas.length, passos: lote.steps.length };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

const USAGE = `uso: node scripts/exportar.mjs <slug> <peca> --doc <id do PSD da peça> [--tipo jpg|png]
gera <pauta>/etapas/90-exportar-<peca>.json: uma imagem por prancheta, na pasta de saída (aplicar direto, conforme a skill ps-plan).`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const a = parseArgs(process.argv.slice(2));
    if (!a._[0] || !a._[1] || a.doc === undefined) throw new Error(USAGE);
    process.stdout.write(JSON.stringify(gerar({ slug: a._[0], peca: a._[1], doc: a.doc, tipo: a.tipo })) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
