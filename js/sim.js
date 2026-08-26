'use strict';
// A ramp is a right triangle, not a box: two flat legs plus the 45° hypotenuse,
// and the other half of the cell is empty air the ball must fly straight through.
// Treat it as the intersection of three half-planes, resolve against the one the
// ball has entered least far (the same minimum-penetration rule the box path uses),
// and reflect off that face — so a leg bounces like a brick and only the slope
// gives the quarter turn. Returns false when the ball is in the empty half.
function hitRamp(b, k) {
  const a = k.type === 'rampA';
  const w = k.w, h = k.h, L = Math.hypot(w, h);
  // Outward face normals and the ball's distance outside each face.
  const faces = [
    { nx: 0, ny: 1, d: b.y - (k.y + h) },                                   // flat bottom
    a ? { nx: 1, ny: 0, d: b.x - (k.x + w) } : { nx: -1, ny: 0, d: k.x - b.x }, // flat side
    a
      ? { nx: -h / L, ny: -w / L, d: (w * h - (b.x - k.x) * h - (b.y - k.y) * w) / L }
      : { nx: h / L, ny: -w / L, d: ((b.x - k.x) * h - (b.y - k.y) * w) / L }    // hypotenuse
  ];
  let best = null;
  for (const f of faces) {
    const depth = BALL_R - f.d;
    if (depth <= 0) return false;   // clear of this face, so clear of the triangle
    if (!best || depth < best.depth) best = { f, depth };
  }
  const f = best.f;
  b.x += f.nx * best.depth;
  b.y += f.ny * best.depth;
  const dot = b.vx * f.nx + b.vy * f.ny;
  if (dot < 0) { b.vx -= 2 * dot * f.nx; b.vy -= 2 * dot * f.ny; }
  return true;
}

function collideBricks(b) {
  for (const k of bricks) {
    if (k.dead) continue;
    const l = k.x - BALL_R, r = k.x + k.w + BALL_R, t = k.y - BALL_R, bt = k.y + k.h + BALL_R;
    if (b.x < l || b.x > r || b.y < t || b.y > bt) continue;
    if (k.type === 'rampA' || k.type === 'rampB') {
      if (b.shapeCd > 0) continue;
      if (!hitRamp(b, k)) continue;
      b.shapeCd = 0.09;
      damage(k, 1);
      return true;
    }
    if (k.type === 'orb') {
      if (b.shapeCd > 0) continue;
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
      const rad = k.w / 2 + BALL_R + 0.5;
      let nx = b.x - cx, ny = b.y - cy;
      const d = Math.hypot(nx, ny) || 1;
      // An orb is round, so the cell's corners are empty air: test the circle, not
      // the box the outer loop matched on.
      if (d > rad) continue;
      nx /= d; ny /= d;
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= 2 * dot * nx;
      b.vy -= 2 * dot * ny;
      b.x = cx + nx * rad;
      b.y = cy + ny * rad;
      b.shapeCd = 0.09;
      damage(k, 1);
      return true;
    }
    const pl = b.x - l, pr = r - b.x, pt = b.y - t, pb = bt - b.y;
    if (b.pierce) {
      if (!b.hit.has(k.uid)) {
        b.hit.add(k.uid);
        damage(k, 1);
        if (b.bomb && b.cd <= 0) { b.cd = 0.06; explodeAt(b.x, b.y, 50); }
      }
      continue;
    }
    const m = Math.min(pl, pr, pt, pb);
    if (m === pl) { b.x = l; b.vx = -Math.abs(b.vx); }
    else if (m === pr) { b.x = r; b.vx = Math.abs(b.vx); }
    else if (m === pt) { b.y = t; b.vy = -Math.abs(b.vy); }
    else { b.y = bt; b.vy = Math.abs(b.vy); }
    if (b.bomb && b.cd <= 0) { b.cd = 0.06; explodeAt(b.x, b.y, 50); return true; }
    damage(k, 1);
    return true;
  }
  return false;
}

function moveBalls(dt) {
  const k = speedMult;
  const steps = Math.max(1, Math.ceil(BALL_SPEED * k * dt / BALL_R));
  const sdt = dt / steps;
  for (let bi = balls.length - 1; bi >= 0; bi--) {
    const b = balls[bi];
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * sdt * k;
      b.y += b.vy * sdt * k;
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
      if (b.cd > 0) b.cd -= sdt;
      if (b.shapeCd > 0) b.shapeCd -= sdt;
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
    if (!autoSped && speedMult === 1 && volleyElapsed > AUTO_SPEED_AFTER) {
      speedMult = SPEED_BOOST;
      autoSped = true;
      addText(W / 2, H - 150, 'AUTO SPEED x' + SPEED_BOOST, '#fbbf24', 1, 17);
    }
    const stg = speedMult > 1 ? STAGGER_MS / 3 : STAGGER_MS;
    volleyAcc += dt * 1000;
    while (pendingShots > 0 && volleyAcc >= stg) {
      volleyAcc -= stg;
      pendingShots--;
      const pr = pierceLeft > 0, bm = bombLeft > 0;
      if (pr) pierceLeft--;
      if (bm) bombLeft--;
      balls.push({
        x: originX, y: LAUNCH_Y - BALL_R,
        vx: volleyDir.x * BALL_SPEED, vy: volleyDir.y * BALL_SPEED,
        pierce: pr, bomb: bm, hit: new Set(), cd: 0, shapeCd: 0, trail: []
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
