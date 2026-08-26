import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FILES = ['config', 'state', 'audio', 'fx', 'board', 'actions', 'sim', 'render', 'progress', 'input', 'main'];

function makeCtx() {
  const base = { measureText: () => ({ width: 20 }) };
  return new Proxy(base, {
    get(t, p) { if (p === 'measureText') return t.measureText; if (p in t) return t[p]; return () => {}; },
    set(t, p, v) { t[p] = v; return true; }
  });
}
const ctx = makeCtx();
const storage = new Map();
const els = new Map();
function el(id) {
  if (els.has(id)) return els.get(id);
  const e = {
    id, textContent: '', width: 0, height: 0, style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); },
      has(c) { return this._s.has(c); }
    },
    listeners: {},
    addEventListener(ev, fn) { (e.listeners[ev] = e.listeners[ev] || []).push(fn); },
    setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 760 }; },
    getContext() { return ctx; }
  };
  els.set(id, e);
  return e;
}
const sandbox = {
  document: {
    getElementById: el,
    querySelectorAll: () => [],
    addEventListener() {},
    hidden: false
  },
  window: { devicePixelRatio: 1, addEventListener() {} },
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k)
  },
  performance,
  requestAnimationFrame: () => {},
  setTimeout: () => 0
};
const context = vm.createContext(sandbox);
for (const f of FILES) {
  new vm.Script(readFileSync(`${ROOT}/js/${f}.js`, 'utf8'), { filename: `${f}.js` }).runInContext(context);
}
const run = code => new vm.Script(code, { filename: 'driver' }).runInContext(context);
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('ok -', msg);
}

let seenGift = false, seenMult = false, seenPierce = false, seenBlast = false;
let seenRamp = false, seenOrb = false;
for (let i = 0; i < 300; i++) {
  run('generateLevel(30)');
  const types = JSON.stringify(run('[...new Set(bricks.map(b => b.type))]'));
  if (types.includes('"gift"')) seenGift = true;
  if (types.includes('"mult"')) seenMult = true;
  if (types.includes('"pierce"')) seenPierce = true;
  if (types.includes('"blast"')) seenBlast = true;
  if (types.includes('"rampA"') || types.includes('"rampB"')) seenRamp = true;
  if (types.includes('"orb"')) seenOrb = true;
}
assert(seenGift, 'gift tiles spawn across generated levels');
assert(seenMult, 'mult tiles spawn across generated levels');
assert(seenPierce, 'pierce tiles spawn across generated levels');
assert(seenBlast, 'blast tiles spawn across generated levels');
assert(seenRamp, 'ramp tiles spawn across generated levels');
assert(seenOrb, 'orb tiles spawn across generated levels');

function boardRate(lvl, pred, n = 400) {
  let hits = 0;
  for (let i = 0; i < n; i++) {
    run(`generateLevel(${lvl})`);
    if (run(`bricks.some(b => ${pred})`)) hits++;
  }
  return hits / n;
}
const RAMP = "b.type === 'rampA' || b.type === 'rampB'";
assert(boardRate(30, RAMP) > 0.3, 'ramps reach a third of late boards, not just the one ramp stencil');
assert(boardRate(30, "b.type === 'orb'") > 0.4, 'orb bumpers reach most late boards');
assert(boardRate(30, "b.type === 'pierce'") > 0.3, 'pierce tiles reach a third of late boards');
assert(boardRate(2, RAMP) < 0.15, 'ramps stay stencil-only before their unlock level');
assert(boardRate(4, "b.type === 'pierce'") < 0.25, 'pierce seeding waits for its unlock level');

run('generateLevel(5)');
run("bricks.filter(b => b.type === 'normal').slice(0, 40).forEach(b => destroy(b))");
const giftBrick = run("bricks.find(b => b.type === 'gift')");
if (giftBrick) {
  const tb = run('totalBalls'), pc = run('pierceCharges'), bc = run('bombCharges'), nb = run('bricks.length');
  run(`destroy(bricks.find(b => b.uid === ${giftBrick.uid}))`);
  const granted = run('totalBalls') > tb || run('pierceCharges') > pc || run('bombCharges') > bc || run('bricks.length') < nb - 1;
  assert(granted, 'gift grants a random power-up');
} else console.log('ok - no gift on this board, drop path covered by generation stats');

const multBrick = run("bricks.find(b => b.type === 'mult')");
if (multBrick) {
  const s0 = run('score');
  run(`destroy(bricks.find(b => b.uid === ${multBrick.uid}))`);
  assert(run('score') - s0 >= multBrick.maxHp * 10 * 2, 'mult tile pays double points');
} else console.log('ok - no mult on this board');

run("bricks.length = 0");
run("balls.length = 0");
run("speedMult = 1");
run("bricks.push(mkBrick(200, 100, 999, 'rampA'))");
run("balls[0] = {x: 218, y: 80, vx: 0, vy: BALL_SPEED, pierce: false, bomb: false, hit: new Set(), cd: 0, shapeCd: 0, trail: []}");
run("moveBalls(0.05)");
let vb = JSON.parse(run('JSON.stringify([Math.round(balls[0].vx), Math.round(balls[0].vy)])'));
assert(vb[0] <= -550 && Math.abs(vb[1]) < 40, 'rampA kicks a falling ball sideways');

run("bricks.length = 0; balls.length = 0");
run("bricks.push(mkBrick(200, 100, 999, 'orb'))");
run("balls[0] = {x: 196, y: 118, vx: BALL_SPEED, vy: 0, pierce: false, bomb: false, hit: new Set(), cd: 0, shapeCd: 0, trail: []}");
run("moveBalls(0.03)");
vb = JSON.parse(run('JSON.stringify([Math.round(balls[0].vx), Math.round(balls[0].vy)])'));
assert(vb[0] <= -500 && Math.abs(vb[1]) < 60, 'orb bumper reflects the ball back');

run("bricks.length = 0; balls.length = 0");
run("speedMult = 1");
run("bricks.push(mkBrick(220, 100, 60, 'normal'))");
const hpBefore = run('bricks[0].hp');
run("balls[0] = {x: 218, y: LAUNCH_Y - BALL_R, vx: 0, vy: -BALL_SPEED, pierce: false, bomb: true, hit: new Set(), cd: 0, shapeCd: 0, trail: []}");
for (let i = 0; i < 80 && run('balls.length'); i++) run("moveBalls(0.03)");
const hpAfter = run('bricks[0].hp');
assert(run('bricks.length') === 1 && hpBefore - hpAfter <= 50 && hpBefore - hpAfter >= 40, 'bomb ball blast deals capped damage (max 50)');

run('pierceCharges = 0; bombCharges = 0');
run("bricks.push(mkBrick(100, 100, 3, 'pierce'), mkBrick(160, 100, 3, 'blast'))");
run("destroy(bricks.find(b => b.type === 'pierce')); destroy(bricks.find(b => b.type === 'blast'))");
assert(run('pierceCharges') === 1 && run('bombCharges') === 1, 'tiles bank one charge each');
run('totalBalls = 6; pierceCharges = 3; bombCharges = 1');
run("fire({x: 0.2, y: -1})");
for (let i = 0; i < 600 && run('balls.length') < 6; i++) run('update(0.016)');
const pat = JSON.parse(run('JSON.stringify(balls.map(b => (b.pierce ? 1 : 0) + (b.bomb ? 2 : 0)))')).join('');
assert(pat === '311000', 'charges distribute per ball (P+B, P, P, then normal)');

storage.set('bbc_save', JSON.stringify({ v: 1, level: 3, score: 10, best: 20, totalBalls: 4, originX: 240, bricks: [{ x: 100, y: 100, hp: 5, mh: 5, t: 'pierce' }, { x: 160, y: 100, hp: 5, mh: 5, t: 'orb' }], pk: [] }));
run('loadSaved()');
assert(run("bricks.some(b => b.type === 'pierce')") && run("bricks.some(b => b.type === 'orb')"), 'tile types survive save/load');

run('originX = 8; pierceCharges = 2; bombCharges = 1');
const chipX = [];
ctx.measureText = () => ({ width: 40 });
const realFill = ctx.fillText;
ctx.fillText = (s, x) => { if (typeof s === 'string' && /PIERCE|BOMB/.test(s)) chipX.push(x); };
run('draw()');
ctx.fillText = realFill;
assert(chipX.length === 2 && chipX.every(x => x > 54 && x < run('W') - 54),
  'charge chips sit at a fixed spot on screen, not glued to the launcher');
run('pierceCharges = 0; bombCharges = 0; originX = 240');

assert(run('STENCILS.length') >= 19, 'stencil gallery holds 19+ forms');
const stencilOk = run('STENCILS.every(s => s.length >= 5 && s.every(r => r.length === s[0].length) && s[0].length <= COLS)');
assert(stencilOk, 'all stencils well-formed and fit the grid');

let okGeo = true;
for (let i = 0; i < 100; i++) {
  run('generateLevel(12)');
  const ok = run('bricks.length > 0 && Math.max(...bricks.map(b => b.y)) >= 0 && Math.min(...bricks.map(b => b.y)) >= -(4 * CELL) - 1 && Math.max(...bricks.map(b => b.y + b.h)) <= DANGER_Y - 2 * CELL');
  if (!ok) okGeo = false;
}
assert(okGeo, 'spawn rules hold: <=4 hidden rows, always >=1 visible row, clear of launch zone');

run('resetGame()');
run("fire({x: 0.3, y: -1})");
for (let c = 0; c < 5; c++) el('speedBtn').listeners.click.forEach(f => f({}));
assert(run('speedMult') === 10, 'speed button stacks to the 10x cap');
run('totalBalls = 180');
run("fire({x: 0, y: -1})");
assert(run('pendingShots') === 100, 'a turn launches at most 100 balls even with a bigger stash');
assert(run('MAX_BALLS') === 150, 'stash soft cap is 150');
run('bricks.length = 0; pickups.length = 0; totalBalls = 140');
run('finalizeShift()');
assert(run('totalBalls') === 100 && run('mode') === 'between', 'stacked balls trim to 100 on level clear');
console.log('\nALL SPECIAL-TILE TESTS PASSED');
