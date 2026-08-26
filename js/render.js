'use strict';
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
    const mx = b.x + b.w / 2, my = by + b.h / 2;
    if (b.type === 'rampA' || b.type === 'rampB') {
      ctx.beginPath();
      if (b.type === 'rampA') {
        ctx.moveTo(b.x, by + b.h); ctx.lineTo(b.x + b.w, by + b.h); ctx.lineTo(b.x + b.w, by);
      } else {
        ctx.moveTo(b.x, by + b.h); ctx.lineTo(b.x + b.w, by + b.h); ctx.lineTo(b.x, by);
      }
      ctx.closePath();
      ctx.fillStyle = tileColor(b); ctx.fill();
      ctx.strokeStyle = 'rgba(8,47,73,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#083344';
      ctx.font = '800 12px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, b.x + b.w * 0.66, by + b.h * 0.68);
      if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (b.flash * 0.7).toFixed(2) + ')'; ctx.fill(); }
      continue;
    }
    if (b.type === 'orb') {
      ctx.beginPath(); ctx.arc(mx, my, BSIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = tileColor(b); ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.55)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx, my, BSIZE / 2 - 5, Math.PI * 0.95, Math.PI * 1.65); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '800 12px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, mx, my + 1);
      if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (b.flash * 0.7).toFixed(2) + ')'; ctx.fill(); }
      continue;
    }
    rr(b.x, by, b.w, b.h, 9);
    ctx.fillStyle = tileColor(b); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.stroke();
    rr(b.x + 3, by + 3, b.w - 6, b.h * 0.32, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    if (b.type === 'bomb') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(mx - 1, my + 3, BSIZE * 0.27, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx - 1, my + 3, BSIZE * 0.27, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(mx + 4, my - 8); ctx.quadraticCurveTo(mx + 10, my - 14, mx + 14, my - 11); ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(mx + 15, my - 11, 2.6, 0, Math.PI * 2); ctx.fill();
    } else if (b.type === 'gift') {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 19px system-ui,sans-serif';
      ctx.fillText('?', mx, my - 4);
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText(b.hp, mx, my + 11);
    } else if (b.type === 'mult') {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 14px system-ui,sans-serif';
      ctx.fillText('×2', mx, my - 4);
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.fillText(b.hp, mx, my + 10);
    } else if (b.type === 'pierce') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(mx - 9, my - 10); ctx.lineTo(mx - 2, my - 3); ctx.lineTo(mx - 9, my + 4); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + 1, my - 10); ctx.lineTo(mx + 8, my - 3); ctx.lineTo(mx + 1, my + 4); ctx.closePath(); ctx.fill();
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, mx, my + 11);
    } else if (b.type === 'blast') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? 8 : 3.4;
        const px = mx + Math.cos(a) * rad, py = my - 4 + Math.sin(a) * rad;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.font = '700 11px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.hp, mx, my + 11);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '800 ' + (b.hp > 99 ? 12 : b.hp > 9 ? 15 : 17) + 'px system-ui,sans-serif';
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
    rr(x - w / 2, CHIP_Y, w, 17, 8);
    ctx.fillStyle = 'rgba(13,16,26,0.85)'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(str, x, CHIP_Y + 9);
  }
  if (pierceCharges + pierceLeft > 0) {
    const n = pierceCharges + pierceLeft;
    tag(n > 1 ? 'PIERCE ×' + n : 'PIERCE', W / 2 - CHIP_DX, '#a78bfa');
  }
  if (bombCharges + bombLeft > 0) {
    const n = bombCharges + bombLeft;
    tag(n > 1 ? 'BOMB ×' + n : 'BOMB', W / 2 + CHIP_DX, '#fb923c');
  }

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

function syncActions() {
  const act = mode === 'shooting';
  recallBtn.classList.toggle('dim', !act);
  speedBtn.classList.toggle('dim', !act);
  speedBtn.classList.toggle('lit', speedMult > 1);
}
