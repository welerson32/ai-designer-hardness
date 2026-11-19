const assert = require('node:assert');
const { evaluate } = require('./scout-readonly-guard.cjs');

const allowed = (commands) => assert.strictEqual(evaluate({ tool_input: { commands } }), null);
const denied = (commands) => assert.notStrictEqual(evaluate({ tool_input: { commands } }), null);

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

console.log('scout-readonly-guard: ok');
