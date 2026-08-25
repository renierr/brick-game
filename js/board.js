'use strict';
function mkBrick(x, y, hp, type) {
  return { uid: uidSeq++, x, y, w: BSIZE, h: BSIZE, hp, maxHp: hp, type: type || 'normal', flash: 1, dead: false };
}
function mkPickup(x, y) {
  return { x: x + BSIZE / 2, y: y + BSIZE / 2, r: 16, seed: Math.random() * 6 };
}

const PATTERNS = ['full', 'checker', 'pyramid', 'diamond', 'weave', 'stripes'];
function generateLevel(lvl) {
  bricks.length = 0; pickups.length = 0;
  const rows = clamp(3 + Math.floor(lvl / 2) + randInt(0, 1), 3, 7);
  const pat = PATTERNS[randInt(0, PATTERNS.length - 1)];
  const lo = Math.max(1, Math.round(lvl * 0.8));
  const hi = Math.max(lo + 2, Math.round(lvl * 1.7));
  const density = clamp(0.52 + lvl * 0.02, 0.52, 0.82);
  const cx = (COLS - 1) / 2, cy = (rows - 1) / 2;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      let keep = true;
      const dc = Math.abs(c - cx), dr = Math.abs(r - cy);
      if (pat === 'checker') keep = ((r + c) % 2 === 0) && Math.random() < density + 0.12;
      else if (pat === 'pyramid') keep = dc <= r * (cx + 0.6) / rows + 0.62 && Math.random() < density + 0.08;
      else if (pat === 'diamond') keep = dc + dr <= cy + 1.7 && Math.random() < density + 0.08;
      else if (pat === 'weave') keep = ((r + c) % 2 === 0) || (r % 2 === 0);
      else if (pat === 'stripes') keep = (r % 2 === 0) || Math.random() < 0.35;
      else keep = Math.random() < density;
      if (keep) cells.push({ r, c });
    }
  }
  while (cells.length < COLS) {
    const c = randInt(0, COLS - 1), r = randInt(0, rows - 1);
    if (!cells.some(p => p.r === r && p.c === c)) cells.push({ r, c });
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  let plusBudget = randInt(1, 3);
  const bombP = Math.min(0.04 + lvl * 0.001, 0.08);
  for (const cell of cells) {
    const x = cell.c * CELL + GAP, y = cell.r * CELL + GAP;
    if (plusBudget > 0 && Math.random() < 0.11) {
      plusBudget--;
      pickups.push(mkPickup(x, y));
      continue;
    }
    let hp = randInt(lo, hi);
    if (Math.random() < 0.12) hp = Math.round(hp * 1.5);
    const type = Math.random() < bombP ? 'bomb' : 'normal';
    bricks.push(mkBrick(x, y, hp, type));
  }
  captureCheckpoint();
}
