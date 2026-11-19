function parseCommands(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [v];
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object') return [raw];
  return null;
}

const PREVIEW_ONLY = new Set(['crop', 'imageSize']);

function evaluate(input, allowed, who = 'agente', previewOnly = false) {
  const cmds = parseCommands(input?.tool_input?.commands);
  if (!cmds || cmds.length === 0) return 'commands ausente ou ilegível';
  const bad = cmds.filter((c) => !c || !allowed.has(c._obj)).map((c) => c?._obj ?? '?');
  if (bad.length) return `${who}: _obj não permitido: ${bad.join(', ')} (permitidos: ${[...allowed].join(', ')})`;
  if (previewOnly && cmds.some((c) => PREVIEW_ONLY.has(c._obj)) && cmds[0]._obj !== 'duplicate') {
    return `${who}: crop/imageSize só na mesma chamada, depois de "duplicate" (protege o documento original)`;
  }
  return null;
}

function parseArgv(argv) {
  const opts = { allowed: new Set(), who: 'agente', previewOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--allow') opts.allowed = new Set(String(argv[++i] ?? '').split(',').filter(Boolean));
    else if (argv[i] === '--who') opts.who = argv[++i];
    else if (argv[i] === '--preview-only') opts.previewOnly = true;
  }
  return opts;
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

if (require.main === module) {
  const { allowed, who, previewOnly } = parseArgv(process.argv.slice(2));
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    if (allowed.size === 0) {
      deny('batchplay-guard sem --allow configurado');
      return;
    }
    let input;
    try {
      input = JSON.parse(buf);
    } catch {
      deny('entrada do hook ilegível');
      return;
    }
    const reason = evaluate(input, allowed, who, previewOnly);
    if (reason) deny(reason);
  });
}

module.exports = { evaluate, parseArgv };
