const READ_OBJS = new Set(['get', 'multiGet']);

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

function evaluate(input) {
  const cmds = parseCommands(input?.tool_input?.commands);
  if (!cmds || cmds.length === 0) return 'commands ausente ou ilegível';
  const bad = cmds.filter((c) => !c || !READ_OBJS.has(c._obj)).map((c) => c?._obj ?? '?');
  if (bad.length) return `ps-scout é read-only; _obj não permitido: ${bad.join(', ')}`;
  return null;
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
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let input;
    try {
      input = JSON.parse(buf);
    } catch {
      deny('entrada do hook ilegível');
      return;
    }
    const reason = evaluate(input);
    if (reason) deny(reason);
  });
}

module.exports = { evaluate };
