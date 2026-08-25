'use strict';
(() => {
const W = 480, H = 760, COLS = 8, CELL = W / COLS, GAP = 6, BSIZE = CELL - GAP * 2;
const LAUNCH_Y = H - 34, DANGER_Y = H - 80;
const BALL_R = 7, BALL_SPEED = 560, STAGGER_MS = 70, MAX_VOLLEY_S = 25;
const MIN_ANGLE = Math.PI / 20, MAX_BALLS = 250, SHIFT_S = 0.22;

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = W * dpr; cv.height = H * dpr;

const scoreEl = $('score'), bestEl = $('best'), lvEl = $('lv'), ballsEl = $('balls');
const overlayEl = $('overlay'), finalScoreEl = $('finalScore'), finalBestEl = $('finalBest');
const powerOverlay = $('powerOverlay'), bannerEl = $('banner'), hintEl = $('hint');
const muteLine = $('muteLine');

let bricks = [], pickups = [], balls = [], particles = [], texts = [], rings = [];
let level = 1, score = 0, totalBalls = 1, originX = W / 2;
let best = +(localStorage.getItem('bbc_best') || 0);
let muted = localStorage.getItem('bbc_mute') === '1';
let mode = 'aiming', uidSeq = 1, timeSec = 0;
let pendingShots = 0, volleyDir = { x: 0, y: -1 }, volleyAcc = 0, volleyElapsed = 0, firstLandX = null;
let pierceArmed = false, bombArmed = false, pierceFlag = false, bombFlag = false;
let shiftT = 0, betweenTimer = 0, hintAlpha = 1, shake = 0, firedOnce = false;
let aiming = false, aimPt = null;

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOut = t => 1 - (1 - t) * (1 - t);

function colorByHp(hp) {
  const t = Math.min(1, (hp - 1) / 49);
  return 'hsl(' + Math.round(30 + t * 255) + ' 72% ' + Math.round(52 - t * 8) + '%)';
}

let actx = null, master = null;
function ensureAudio() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.32;
      master.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(f, d, type, g, slide) {
  if (muted || !actx) return;
  const t0 = actx.currentTime;
  const o = actx.createOscillator(), v = actx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
  v.gain.setValueAtTime(g || 0.3, t0);
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(v); v.connect(master);
  o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, g) {
  if (muted || !actx) return;
  const n = Math.floor(actx.sampleRate * d);
  const buf = actx.createBuffer(1, n, actx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = actx.createBufferSource(); src.buffer = buf;
  const v = actx.createGain(); v.gain.value = g;
  src.connect(v); v.connect(master); src.start();
}
const sfx = {
  hit() { tone(300 + Math.random() * 120, 0.05, 'square', 0.09); },
  break_() { tone(520, 0.09, 'triangle', 0.26, -180); noise(0.07, 0.08); },
  boom() { noise(0.3, 0.45); tone(90, 0.35, 'sawtooth', 0.3, -40); },
  plus() { tone(520, 0.08, 'sine', 0.22); setTimeout(() => tone(780, 0.1, 'sine', 0.22), 70); },
  arm() { tone(240, 0.07, 'square', 0.18); setTimeout(() => tone(360, 0.07, 'square', 0.18), 60); },
  launch() { tone(340, 0.09, 'triangle', 0.2, 220); },
  clear() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.22), i * 90)); },
  over() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.2), i * 160)); }
};

function addText(x, y, str, color, life, size) {
  texts.push({ x, y, str, color: color || '#fff', life: life || 0.9, max: life || 0.9, size: size || 15 });
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 240;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5 + Math.random() * 0.35, max: 0.85, color, size: 2 + Math.random() * 3 });
  }
}
function banner(txt) {
  bannerEl.textContent = txt;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
}

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
}

function explodeAt(x, y) {
  rings.push({ x, y, r: CELL * 0.5, max: CELL * 2.1, life: 1 });
  burst(x, y, '#fb923c', 26);
  sfx.boom();
  shake = Math.max(shake, 10);
  const rad = CELL * 1.95;
  const snap = bricks.filter(b => {
    const dx = b.x + b.w / 2 - x, dy = b.y + b.h / 2 - y;
    return dx * dx + dy * dy <= rad * rad;
  });
  for (const b of snap) damage(b, 9999);
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
  const pts = k.maxHp * 10 + level * 2;
  score += pts;
  if (score > best) { best = score; localStorage.setItem('bbc_best', best); }
  addText(k.x + k.w / 2, k.y + k.h / 2, '+' + pts, colorByHp(k.maxHp), 0.8, 14);
  burst(k.x + k.w / 2, k.y + k.h / 2, colorByHp(k.maxHp), 14);
  if (k.type === 'bomb') explodeAt(k.x + k.w / 2, k.y + k.h / 2);
  else { sfx.break_(); shake = Math.min(shake + 2, 6); }
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
    addText(originX, LAUNCH_Y - 46, '+10 BALLS', '#38bdf8', 1, 16);
    sfx.plus();
  } else if (kind === 'pierce') {
    pierceArmed = true;
    addText(originX, LAUNCH_Y - 46, 'PIERCE ARMED', '#a78bfa', 1, 16);
    sfx.arm();
  } else if (kind === 'bomb') {
    bombArmed = true;
    addText(originX, LAUNCH_Y - 46, 'BOMBS ARMED', '#fb923c', 1, 16);
    sfx.arm();
  } else if (kind === 'row') {
    clearRow();
  }
  closePower();
  updateHud();
}

function fire(dir) {
  volleyDir = dir;
  pierceFlag = pierceArmed; bombFlag = bombArmed;
  pierceArmed = false; bombArmed = false;
  pendingShots = totalBalls;
  volleyAcc = STAGGER_MS;
  volleyElapsed = 0;
  firstLandX = null;
  firedOnce = true;
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
    if (score > best) { best = score; localStorage.setItem('bbc_best', best); }
    addText(W / 2, H / 2, '+' + bonus, '#fbbf24', 1.4, 24);
    banner('LEVEL ' + (level + 1));
    totalBalls = Math.min(MAX_BALLS, totalBalls + 2);
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
  if (score > best) { best = score; localStorage.setItem('bbc_best', best); }
  updateHud();
  finalScoreEl.textContent = score;
  finalBestEl.textContent = 'Best: ' + best;
  overlayEl.classList.remove('hidden');
  sfx.over();
}

function resetGame() {
  bricks.length = 0; pickups.length = 0; balls.length = 0;
  particles.length = 0; texts.length = 0; rings.length = 0;
  level = 1; score = 0; totalBalls = 1; originX = W / 2;
  pierceArmed = bombArmed = pierceFlag = bombFlag = false;
  pendingShots = 0; firstLandX = null; aiming = false; aimPt = null;
  overlayEl.classList.add('hidden');
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
}

function collideBricks(b) {
  for (const k of bricks) {
    if (k.dead) continue;
    const l = k.x - BALL_R, r = k.x + k.w + BALL_R, t = k.y - BALL_R, bt = k.y + k.h + BALL_R;
    if (b.x < l || b.x > r || b.y < t || b.y > bt) continue;
    const pl = b.x - l, pr = r - b.x, pt = b.y - t, pb = bt - b.y;
    if (b.pierce) {
      if (!b.hit.has(k.uid)) {
        b.hit.add(k.uid);
        damage(k, 1);
        if (b.bomb && b.cd <= 0) { b.cd = 0.06; explodeAt(b.x, b.y); }
      }
      continue;
    }
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) { b.x = l; b.vx = -Math.abs(b.vx); }
    else if (m === pr) { b.x = r; b.vx = Math.abs(b.vx); }
    else if (m === pt) { b.y = t; b.vy = -Math.abs(b.vy); }
    else { b.y = bt; b.vy = Math.abs(b.vy); }
    damage(k, 1);
    if (b.bomb && b.cd <= 0) { b.cd = 0.06; explodeAt(b.x, b.y); }
    return true;
  }
  return false;
}

function moveBalls(dt) {
  const steps = Math.max(1, Math.ceil(BALL_SPEED * dt / BALL_R));
  const sdt = dt / steps;
  for (let bi = balls.length - 1; bi >= 0; bi--) {
    const b = balls[bi];
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.cd > 0) b.cd -= sdt;
      collideBricks(b);
      for (let pi = pickups.length - 1; pi >= 0; pi--) {
        const p = pickups[pi];
        const dx = b.x - p.x, dy = b.y - p.y;
        if (dx * dx + dy * dy < (p.r + BALL_R) * (p.r + BALL_R)) {
          pickups.splice(pi, 1);
          totalBalls = Math.min(MAX_BALLS, totalBalls + 1);
          addText(p.x, p.y - 10, '+1 BALL', '#34d399', 0.9, 14);
          burst(p.x, p.y, '#34d399', 10);
          sfx.plus();
          updateHud();
        }
      }
      if (b.y > LAUNCH_Y + BALL_R * 2) {
        if (firstLandX == null) firstLandX = b.x;
        balls.splice(bi, 1);
        break;
      }
    }
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 9) b.trail.shift();
  }
  if (volleyElapsed > MAX_VOLLEY_S) balls.length = 0;
}

function stepFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 500 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.y -= 42 * dt;
    t.life -= dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.r += (r.max - r.r) * Math.min(1, dt * 9);
    r.life -= dt * 2.4;
    if (r.life <= 0) rings.splice(i, 1);
  }
  for (const b of bricks) if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 5);
}

function update(dt) {
  timeSec += dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 26);
  if (firedOnce && hintAlpha > 0) hintAlpha = Math.max(0, hintAlpha - dt * 2);
  hintEl.style.opacity = hintAlpha.toFixed(2);
  stepFx(dt);
  if (mode === 'shooting') {
    volleyElapsed += dt;
    volleyAcc += dt * 1000;
    while (pendingShots > 0 && volleyAcc >= STAGGER_MS) {
      volleyAcc -= STAGGER_MS;
      pendingShots--;
      balls.push({
        x: originX, y: LAUNCH_Y - BALL_R,
        vx: volleyDir.x * BALL_SPEED, vy: volleyDir.y * BALL_SPEED,
        pierce: pierceFlag, bomb: bombFlag, hit: new Set(), cd: 0, trail: []
      });
    }
    moveBalls(dt);
    if (pendingShots === 0 && balls.length === 0) {
      originX = clamp(firstLandX == null ? originX : firstLandX, BALL_R + 4, W - BALL_R - 4);
      startShift();
    }
  } else if (mode === 'shifting') {
    shiftT += dt / SHIFT_S;
    if (shiftT >= 1) finalizeShift();
  } else if (mode === 'between') {
    betweenTimer -= dt;
    if (betweenTimer <= 0) {
      level++;
      generateLevel(level);
      updateHud();
      mode = 'aiming';
    }
  }
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function aimDir() {
  const dx = aimPt.x - originX;
  let dy = aimPt.y - LAUNCH_Y;
  if (dy > -14) dy = -14;
  let ang = Math.atan2(dy, dx);
  const m = MIN_ANGLE;
  if (ang > -m) ang = dx < 0 ? -Math.PI + m : -m;
  if (ang < -Math.PI + m) ang = -Math.PI + m;
  return { x: Math.cos(ang), y: Math.sin(ang) };
}

function simTrajectory(dir) {
  const pts = [{ x: originX, y: LAUNCH_Y }];
  let px = originX, py = LAUNCH_Y, vx = dir.x, vy = dir.y;
  const step = 6;
  const off = mode === 'shifting' ? easeOut(Math.min(shiftT, 1)) * CELL : 0;
  outer:
  for (let i = 0; i < 420; i++) {
    px += vx * step; py += vy * step;
    if (px < BALL_R) { px = BALL_R; vx = Math.abs(vx); }
    if (px > W - BALL_R) { px = W - BALL_R; vx = -Math.abs(vx); }
    if (py < BALL_R) { py = BALL_R; vy = Math.abs(vy); }
    for (const b of bricks) {
      if (px > b.x - BALL_R && px < b.x + b.w + BALL_R && py > b.y + off - BALL_R && py < b.y + off + b.h + BALL_R) {
        pts.push({ x: px, y: py });
        break outer;
      }
    }
    if (i % 3 === 0) pts.push({ x: px, y: py });
  }
  return pts;
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, 0, W, H);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.fillStyle = 'rgba(239,68,68,0.07)';
  ctx.fillRect(0, DANGER_Y, W, H - DANGER_Y);
  ctx.strokeStyle = 'rgba(248,113,113,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(W, DANGER_Y); ctx.stroke();
  ctx.setLineDash([]);

  for (const p of pickups) {
    const pulse = 1 + Math.sin(timeSec * 5 + p.seed) * 0.12;
    ctx.strokeStyle = 'rgba(52,211,153,' + (0.35 * pulse).toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#34d399';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y); ctx.lineTo(p.x + 7, p.y);
    ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 7);
    ctx.stroke();
  }

  const off = mode === 'shifting' ? easeOut(Math.min(shiftT, 1)) * CELL : 0;
  for (const b of bricks) {
    const by = b.y + off;
    const col = colorByHp(b.hp);
    rr(b.x, by, b.w, b.h, 9);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.stroke();
    rr(b.x + 3, by + 3, b.w - 6, b.h * 0.32, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    const mx = b.x + b.w / 2, my = by + b.h / 2;
    if (b.type === 'bomb') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(mx - 1, my + 3, BSIZE * 0.27, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx - 1, my + 3, BSIZE * 0.27, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx + 4, my - 8); ctx.quadraticCurveTo(mx + 10, my - 14, mx + 14, my - 11); ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(mx + 15, my - 11, 2.6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '800 ' + (b.hp > 99 ? 13 : b.hp > 9 ? 16 : 18) + 'px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, mx, my + 1);
    }
    if (b.flash > 0) {
      rr(b.x, by, b.w, b.h, 9);
      ctx.fillStyle = 'rgba(255,255,255,' + (b.flash * 0.8).toFixed(2) + ')'; ctx.fill();
    }
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    for (let t = 0; t < b.trail.length; t++) {
      const tp = b.trail[t];
      const a = (t / b.trail.length) * 0.28;
      ctx.fillStyle = b.pierce ? 'rgba(167,139,250,' + a.toFixed(2) + ')' : 'rgba(125,211,252,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(tp.x, tp.y, BALL_R * (t / b.trail.length) * 0.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = b.pierce ? '#a78bfa' : b.bomb ? '#fb923c' : '#f8fafc';
    ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath(); ctx.arc(originX, LAUNCH_Y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(56,189,248,0.25)';
  ctx.beginPath(); ctx.arc(originX, LAUNCH_Y, 19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 11px system-ui,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(totalBalls, originX, LAUNCH_Y + 1);

  function tag(str, x, color) {
    ctx.font = '800 10px system-ui,sans-serif';
    const w = ctx.measureText(str).width + 14;
    rr(x - w / 2, LAUNCH_Y - 40, w, 17, 8);
    ctx.fillStyle = 'rgba(13,16,26,0.85)'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(str, x, LAUNCH_Y - 31);
  }
  if (pierceArmed || pierceFlag) tag('PIERCE', originX - 62, '#a78bfa');
  if (bombArmed || bombFlag) tag('BOMB', originX + 62, '#fb923c');

  if (aiming && aimPt && mode === 'aiming') {
    const dir = aimDir();
    const pts = simTrajectory(dir);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 11]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    const e = pts[pts.length - 1];
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, Math.PI * 2); ctx.fill();
  }

  for (const r of rings) {
    ctx.strokeStyle = 'rgba(251,146,60,' + Math.max(0, r.life * 0.7).toFixed(2) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.fillStyle = t.color;
    ctx.font = '800 ' + t.size + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function ptFromEvent(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
cv.addEventListener('pointerdown', e => {
  ensureAudio();
  if (mode !== 'aiming') return;
  cv.setPointerCapture(e.pointerId);
  aiming = true;
  aimPt = ptFromEvent(e);
});
cv.addEventListener('pointermove', e => { if (aiming) aimPt = ptFromEvent(e); });
cv.addEventListener('pointerup', e => {
  if (!aiming) return;
  aiming = false;
  const p = ptFromEvent(e);
  aimPt = p;
  fire(aimDir());
  aimPt = null;
});
cv.addEventListener('pointercancel', () => { aiming = false; aimPt = null; });
cv.addEventListener('contextmenu', e => e.preventDefault());

function openPower() { powerOverlay.classList.remove('hidden'); }
function closePower() { powerOverlay.classList.add('hidden'); }
$('menuBtn').addEventListener('click', () => { ensureAudio(); openPower(); });
$('closePower').addEventListener('click', closePower);
powerOverlay.addEventListener('pointerdown', e => { if (e.target === powerOverlay) closePower(); });
document.querySelectorAll('.pw').forEach(btn => btn.addEventListener('click', () => usePower(btn.dataset.pw)));
$('restartBtn').addEventListener('click', resetGame);
$('againBtn').addEventListener('click', resetGame);

function applyMuteIcon() {
  muteLine.style.display = muted ? '' : 'none';
  $('wave1').style.display = muted ? 'none' : '';
  $('wave2').style.display = muted ? 'none' : '';
}
$('muteBtn').addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('bbc_mute', muted ? '1' : '0');
  applyMuteIcon();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode !== 'over') update(dt);
  draw();
  requestAnimationFrame(frame);
}

applyMuteIcon();
generateLevel(1);
banner('LEVEL 1');
updateHud();
requestAnimationFrame(frame);
})();
