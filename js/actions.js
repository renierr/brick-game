'use strict';
function explodeAt(x, y, dmg = 9999) {
  rings.push({ x, y, r: CELL * 0.5, max: CELL * 2.1, life: 1 });
  burst(x, y, '#fb923c', 26);
  sfx.boom();
  shake = Math.max(shake, 10);
  const rad = CELL * 1.95;
  const snap = bricks.filter(b => {
    const dx = b.x + b.w / 2 - x, dy = b.y + b.h / 2 - y;
    return dx * dx + dy * dy <= rad * rad;
  });
  for (const b of snap) damage(b, dmg);
}

function damage(k, d) {
  if (k.dead) return;
  k.hp -= d;
  k.flash = 1;
  if (k.hp <= 0 || k.type === 'bomb') destroy(k);
  else sfx.hit();
}

function destroy(k) {
  if (k.dead) return;
  k.dead = true;
  const i = bricks.indexOf(k);
  if (i >= 0) bricks.splice(i, 1);
  let pts = k.maxHp * 10 + level * 2;
  if (k.type === 'mult') pts *= 2;
  score += pts;
  if (score > best) { best = score; storageSet('bbc_best', best); }
  if (k.type === 'mult') addText(k.x + k.w / 2, k.y + k.h / 2, '+' + pts + ' x2!', '#fbbf24', 1, 17);
  else addText(k.x + k.w / 2, k.y + k.h / 2, '+' + pts, colorByHp(k.maxHp), 0.8, 14);
  burst(k.x + k.w / 2, k.y + k.h / 2, colorByHp(k.maxHp), 14);
  if (k.type === 'bomb') explodeAt(k.x + k.w / 2, k.y + k.h / 2);
  else if (k.type === 'gift') {
    const kinds = ['balls', 'pierce', 'bomb', 'row'];
    usePower(kinds[randInt(0, kinds.length - 1)]);
  } else if (k.type === 'pierce') {
    pierceCharges++;
    addText(W / 2, TOAST_Y, 'PIERCE ARMED', '#a78bfa', 1.2, 15);
    sfx.arm();
  } else if (k.type === 'blast') {
    bombCharges++;
    addText(W / 2, TOAST_Y, 'BOMB ARMED', '#fb923c', 1.2, 15);
    sfx.arm();
  } else { sfx.break_(); shake = Math.min(shake + 2, 6); }
  updateHud();
}

function clearRow() {
  if (!bricks.length) return;
  let maxY = -Infinity;
  for (const b of bricks) if (b.y > maxY) maxY = b.y;
  const row = bricks.filter(b => Math.abs(b.y - maxY) < 2);
  addText(W / 2, maxY + BSIZE / 2, 'ROW CLEARED', '#34d399', 1, 17);
  for (const b of [...row]) destroy(b);
}

function usePower(kind) {
  if (mode === 'over') return;
  ensureAudio();
  if (kind === 'balls') {
    totalBalls = Math.min(MAX_BALLS, totalBalls + 10);
    addText(W / 2, TOAST_Y, '+10 BALLS', '#38bdf8', 1, 16);
    sfx.plus();
  } else if (kind === 'pierce') {
    pierceCharges++;
    addText(W / 2, TOAST_Y, 'PIERCE ARMED', '#a78bfa', 1, 16);
    sfx.arm();
  } else if (kind === 'bomb') {
    bombCharges++;
    addText(W / 2, TOAST_Y, 'BOMBS ARMED', '#fb923c', 1, 16);
    sfx.arm();
  } else if (kind === 'row') {
    clearRow();
  }
  closePower();
  updateHud();
}

function fire(dir) {
  volleyDir = dir;
  pierceLeft = pierceCharges; bombLeft = bombCharges;
  pierceCharges = 0; bombCharges = 0;
  pendingShots = Math.min(totalBalls, VOLLEY_CAP);
  volleyAcc = STAGGER_MS;
  volleyElapsed = 0;
  firstLandX = null;
  firedOnce = true;
  speedMult = 1; autoSped = false;
  mode = 'shooting';
  sfx.launch();
}

function startShift() { shiftT = 0; mode = 'shifting'; }

function finalizeShift() {
  for (const b of bricks) b.y += CELL;
  for (const p of pickups) p.y += CELL;
  shiftT = 0;
  if (bricks.some(b => b.y + b.h > DANGER_Y)) { gameOver(); return; }
  if (!bricks.length && !pickups.length) {
    const bonus = 100 * level;
    score += bonus;
    if (score > best) { best = score; storageSet('bbc_best', best); }
    addText(W / 2, H / 2, '+' + bonus, '#fbbf24', 1.4, 24);
    banner('LEVEL ' + (level + 1));
    totalBalls = Math.min(totalBalls + 2, VOLLEY_CAP);
    sfx.clear();
    betweenTimer = 1.1;
    mode = 'between';
  } else {
    mode = 'aiming';
  }
  updateHud();
}

function gameOver() {
  mode = 'over';
  if (score > best) { best = score; storageSet('bbc_best', best); }
  updateHud();
  finalScoreEl.textContent = score;
  finalBestEl.textContent = 'Best: ' + best;
  overlayEl.classList.remove('hidden');
  sfx.over();
  if (checkpoint) writeSave(checkpoint, 'bbc_save');
  else storageRemove('bbc_save');
  saveDirty = false;
}

function resetGame() {
  bricks.length = 0; pickups.length = 0; balls.length = 0;
  particles.length = 0; texts.length = 0; rings.length = 0;
  level = 1; score = 0; totalBalls = 1; originX = W / 2;
  pierceCharges = 0; bombCharges = 0; pierceLeft = 0; bombLeft = 0;
  speedMult = 1; autoSped = false;
  pendingShots = 0; firstLandX = null; aiming = false; aimPt = null;
  overlayEl.classList.add('hidden');
  storageRemove('bbc_save');
  saveDirty = false;
  generateLevel(1);
  banner('LEVEL 1');
  mode = 'aiming';
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  lvEl.textContent = level;
  ballsEl.textContent = totalBalls;
  saveDirty = true;
}

function recallBalls() {
  for (const b of balls) burst(b.x, b.y, '#7dd3fc', 6);
  balls.length = 0;
  pendingShots = 0;
  firstLandX = null;
  addText(W / 2, TOAST_Y, 'RECALLED', '#7dd3fc', 1, 16);
}
