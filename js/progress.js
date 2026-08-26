'use strict';
function saveNow() {
  if (mode === 'over') { saveDirty = false; return; }
  writeSave({
    v: 1, level, score, best, totalBalls, originX,
    bricks: bricks.map(b => ({ x: Math.round(b.x), y: Math.round(b.y), hp: b.hp, mh: b.maxHp, t: b.type })),
    pk: pickups.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, s: p.seed }))
  }, 'bbc_save');
  saveDirty = false;
}

function writeSave(data, key) {
  storageSet(key, JSON.stringify(data));
}

function readKey(key) {
  try { return JSON.parse(storageGet(key) || 'null'); } catch (e) { return null; }
}

function hydrate(d) {
  level = d.level;
  score = d.score | 0;
  totalBalls = clamp(d.totalBalls | 0 || 1, 1, MAX_BALLS);
  originX = clamp(+d.originX || W / 2, BALL_R + 4, W - BALL_R - 4);
  bricks = (Array.isArray(d.bricks) ? d.bricks : [])
    .filter(o => o && typeof o.x === 'number' && typeof o.y === 'number' && o.hp > 0 && o.y + BSIZE < DANGER_Y)
    .map(o => ({
      uid: uidSeq++, x: o.x, y: o.y, w: BSIZE, h: BSIZE,
      hp: o.hp, maxHp: o.mh || o.hp,
      type: ['bomb', 'gift', 'mult', 'pierce', 'blast', 'rampA', 'rampB', 'orb'].includes(o.t) ? o.t : 'normal', flash: 0, dead: false
    }));
  pickups = (Array.isArray(d.pk) ? d.pk : [])
    .filter(o => o && typeof o.x === 'number' && typeof o.y === 'number')
    .map(o => ({ x: o.x, y: o.y, r: o.r || 14, seed: o.s || 0 }));
  balls.length = 0; particles.length = 0; texts.length = 0; rings.length = 0;
  pendingShots = 0; firstLandX = null; aiming = false; aimPt = null;
  pierceCharges = 0; bombCharges = 0; pierceLeft = 0; bombLeft = 0;
  speedMult = 1; autoSped = false;
  shiftT = 0; betweenTimer = 0;
}

function loadSaved() {
  const d = readKey('bbc_save');
  if (!d || d.v !== 1 || typeof d.level !== 'number' || d.level < 1) return false;
  best = Math.max(best, d.best | 0);
  hydrate(d);
  return true;
}

function captureCheckpoint() {
  checkpoint = {
    v: 1, level, score, totalBalls, originX,
    bricks: bricks.map(b => ({ x: b.x, y: b.y, hp: b.hp, mh: b.maxHp, t: b.type })),
    pk: pickups.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), r: p.r, s: p.seed }))
  };
  writeSave(checkpoint, 'bbc_ckpt');
}

function retryLevel() {
  const d = checkpoint || readKey('bbc_ckpt');
  if (!d || typeof d.level !== 'number') { resetGame(); return; }
  overlayEl.classList.add('hidden');
  hydrate(d);
  banner('LEVEL ' + level);
  mode = 'aiming';
  sfx.arm();
  updateHud();
}
