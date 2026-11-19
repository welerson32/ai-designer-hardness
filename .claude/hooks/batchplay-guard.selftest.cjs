const assert = require('node:assert');
const { evaluate, parseArgv } = require('./batchplay-guard.cjs');

const READ = new Set(['get', 'multiGet']);
const PREVIEW = new Set(['get', 'multiGet', 'duplicate', 'crop', 'imageSize', 'close']);

const run = (commands, allowed) => evaluate({ tool_input: { commands } }, allowed, 'teste');
const allowed = (commands, set = READ) => assert.strictEqual(run(commands, set), null);
const denied = (commands, set = READ) => assert.notStrictEqual(run(commands, set), null);

allowed([{ _obj: 'get', _target: [] }]);
allowed([{ _obj: 'multiGet' }]);
allowed('[{"_obj":"get"}]');
allowed({ _obj: 'get' });
denied([{ _obj: 'move' }]);
denied([{ _obj: 'get' }, { _obj: 'delete' }]);
denied('nao e json');
denied([]);
denied(undefined);
denied([null]);

allowed([{ _obj: 'duplicate' }, { _obj: 'crop' }, { _obj: 'imageSize' }, { _obj: 'close' }], PREVIEW);
denied([{ _obj: 'duplicate' }, { _obj: 'move' }], PREVIEW);

const prev = (commands) => evaluate({ tool_input: { commands } }, PREVIEW, 'teste', true);
assert.strictEqual(prev([{ _obj: 'duplicate' }, { _obj: 'crop' }, { _obj: 'imageSize' }]), null);
assert.strictEqual(prev([{ _obj: 'close' }]), null);
assert.notStrictEqual(prev([{ _obj: 'crop' }]), null);
assert.notStrictEqual(prev([{ _obj: 'imageSize' }, { _obj: 'duplicate' }]), null);
assert.strictEqual(parseArgv(['--preview-only']).previewOnly, true);

const opts = parseArgv(['--allow', 'get,multiGet', '--who', 'ps-scout']);
assert.deepStrictEqual([...opts.allowed], ['get', 'multiGet']);
assert.strictEqual(opts.who, 'ps-scout');
assert.strictEqual(parseArgv([]).allowed.size, 0);

console.log('batchplay-guard: ok');
