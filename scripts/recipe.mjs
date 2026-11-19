#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RECIPES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'recipes');
const WHOLE = /^\{\{(\w+)\}\}$/;
const INLINE = /\{\{(\w+)\}\}/g;

export function loadRecipe(name) {
  const file = join(RECIPES_DIR, `${name}.json`);
  if (!existsSync(file)) throw new Error(`receita não encontrada: ${name}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

function fill(node, params, recipe) {
  if (Array.isArray(node)) return node.map((n) => fill(n, params, recipe));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, params, recipe)]));
  }
  if (typeof node !== 'string') return node;
  const need = (key) => {
    if (!(key in params)) throw new Error(`receita ${recipe}: parâmetro ausente "${key}"`);
    return params[key];
  };
  const whole = node.match(WHOLE);
  if (whole) return need(whole[1]);
  return node.replace(INLINE, (_, key) => String(need(key)));
}

export function render(name, params = {}) {
  const recipe = loadRecipe(name);
  return fill(recipe.commands, params, name);
}

export function compileLote(lote) {
  if (!lote?.name || !Array.isArray(lote.steps)) throw new Error('lote precisa de "name" e "steps"');
  const calls = [];
  const pushBatch = (cmds) => {
    const last = calls[calls.length - 1];
    if (last?.type === 'batchPlay') last.commands.push(...cmds);
    else calls.push({ type: 'batchPlay', commands: [...cmds] });
  };
  if (lote.snapshot !== false) pushBatch(render('history-snapshot', { name: `lote:${lote.name}` }));
  lote.steps.forEach((step, i) => {
    if (step.recipe) pushBatch(render(step.recipe, step.params ?? {}));
    else if (step.tool) calls.push({ type: 'tool', name: step.tool, args: step.args ?? {} });
    else throw new Error(`step ${i + 1}: precisa de "recipe" ou "tool"`);
  });
  return calls;
}

function coerce(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;
}

const USAGE = `uso:
  node scripts/recipe.mjs <receita> chave=valor ...   -> lista de comandos batchPlay
  node scripts/recipe.mjs --lote <arquivo.json>         -> chamadas na ordem: [{type:"batchPlay",commands}|{type:"tool",name,args}]`;

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [first, ...rest] = process.argv.slice(2);
  try {
    if (!first) throw new Error(USAGE);
    let out;
    if (first === '--lote') {
      out = compileLote(JSON.parse(readFileSync(rest[0], 'utf8')));
    } else {
      const params = Object.fromEntries(rest.map((kv) => {
        const i = kv.indexOf('=');
        if (i < 1) throw new Error(`parâmetro inválido: ${kv}`);
        return [kv.slice(0, i), coerce(kv.slice(i + 1))];
      }));
      out = render(first, params);
    }
    process.stdout.write(JSON.stringify(out) + '\n');
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
