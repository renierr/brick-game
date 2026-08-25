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
const rafQ = [];
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
  requestAnimationFrame: cb => rafQ.push(cb),
  setTimeout: () => 0
};
sandbox.window.localStorage = sandbox.localStorage;
const context = vm.createContext(sandbox);

for (const f of FILES) {
  const code = readFileSync(`${ROOT}/js/${f}.js`, 'utf8');
  new vm.Script(code, { filename: `${f}.js` }).runInContext(context);
}

function run(code) {
  return new vm.Script(code, { filename: 'driver' }).runInContext(context);
}
let t = performance.now();
run(`__t = ${t} + 16`);
function step(n) {
  for (let i = 0; i < n; i++) {
    run('__t += 16');
    const tt = run('__t');
    run(`frame(${tt})`);
  }
}
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exit(1); }
  console.log('ok -', msg);
}

assert(run('mode') === 'aiming', 'boot lands in aiming');
assert(run('bricks.length') > 0, 'level generated with bricks');
assert(storage.has('bbc_ckpt'), 'checkpoint persisted');

const scoreBefore = run('score');
run("fire({x: 0, y: -1})");
assert(run('mode') === 'shooting', 'fire switches to shooting');
step(600);
assert(run('mode') !== 'shooting', 'volley resolves without hanging');
console.log('ok - volley done, mode =', run('mode'));
if (run('mode') === 'shifting') step(40);
assert(run('bricks.length') < Infinity && run('score') >= scoreBefore, 'sim ran cleanly');

run("usePower('balls')");
assert(run('totalBalls') >= 11, '+10 balls power-up works');

run("fire({x: -0.5, y: -1}); recallBalls()");
step(30);
assert(run('mode') !== 'shooting', 'recall ends the turn');

const lvl = run('level'), ckScore = JSON.parse(storage.get('bbc_ckpt')).score;
run('score = ckScore + 500'.replace('ckScore', ckScore));
run('retryLevel()');
assert(run('score') === ckScore && run('level') === lvl, 'retry restores checkpoint state');
assert(run('mode') === 'aiming', 'retry returns to aiming');

run('[...bricks].forEach(b => destroy(b)); [...pickups].forEach((_, i) => pickups.pop())');
run("fire({x: 0, y: -1})");
step(900);
assert(run('level') === lvl + 1, `clearing board advances to level ${lvl + 1}`);

run('gameOver()');
assert(!el('overlay').classList.has('hidden'), 'game over shows overlay');
assert(JSON.parse(storage.get('bbc_save')).level === lvl + 1, 'save rolled back to level start');
run('retryLevel()');
assert(run('mode') === 'aiming', 'retry from game over works');
assert(el('overlay').classList.has('hidden'), 'overlay hidden after retry');

run('loadSaved()');
assert(run('level') === lvl + 1, 'loadSaved resumes saved level');

console.log('\nALL SMOKE TESTS PASSED');
