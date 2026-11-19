import assert from 'node:assert';
import { center, align, moveTo, grid, distribute } from './geo.mjs';

assert.deepStrictEqual(center({ W: 1080, H: 1350, bounds: '90,120,990,260' }), { dx: 0, dy: 485 });
assert.deepStrictEqual(center({ W: 1000, H: 1000, bounds: '0,0,200,100', axis: 'x' }), { dx: 400, dy: 0 });
assert.deepStrictEqual(align({ W: 1080, H: 1350, bounds: '90,120,990,260', edge: 'right', margin: 60 }), { dx: 30, dy: 0 });
assert.deepStrictEqual(align({ W: 1080, H: 1350, bounds: '90,120,990,260', edge: 'bottom', margin: 60 }), { dx: 0, dy: 1030 });
assert.deepStrictEqual(moveTo({ bounds: '10,20,110,120', x: 0 }), { dx: -10, dy: 0 });
assert.deepStrictEqual(grid({ W: 1080, cols: 3, gutter: 30, margin: 60 }), { col: 300, xs: [60, 390, 720] });
assert.deepStrictEqual(distribute({ start: 0, end: 1000, sizes: '100,100,100' }), { gap: 350, positions: [0, 450, 900] });
assert.throws(() => center({ W: 10, H: 10, bounds: '1,2,3' }));
assert.throws(() => grid({ W: 100, cols: 5, gutter: 50 }));

console.log('geo: ok');
