'use strict';
// Board geometry and the tile painter. Deliberately free of DOM and game state so
// help.html can draw the very same tiles the board does — the legend in the docs
// can never drift from what the player actually sees.
const W = 480, H = 760, COLS = 13, CELL = W / COLS, GAP = 0, BSIZE = CELL - GAP * 2;
const LAUNCH_Y = H - 34, DANGER_Y = H - 80;

function colorByHp(hp) {
  const t = Math.min(1, (hp - 1) / 49);
  return 'hsl(' + Math.round(30 + t * 255) + ' 72% ' + Math.round(52 - t * 8) + '%)';
}

function tileColor(b) {
  if (b.type === 'gift') return '#10b981';
  if (b.type === 'mult') return '#f59e0b';
  if (b.type === 'pierce') return '#8b5cf6';
  if (b.type === 'blast') return '#ef4444';
  if (b.type === 'rampA' || b.type === 'rampB') return '#22d3ee';
  if (b.type === 'orb') return '#94a3b8';
  return colorByHp(b.hp);
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Paints one brick at (x, y) with size w x h. `b` needs type, hp and (optionally)
// flash — anything shaped like a board brick works, so the docs can hand it a literal.
function paintTile(g, b, x, y, w, h) {
  const mx = x + w / 2, my = y + h / 2;
  const flash = b.flash > 0 ? b.flash : 0;
  if (b.type === 'rampA' || b.type === 'rampB') {
    // rampA is the "/" slope (solid lower-right), rampB the "\" (solid lower-left).
    g.beginPath();
    if (b.type === 'rampA') {
      g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w, y);
    } else {
      g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = tileColor(b); g.fill();
    g.strokeStyle = 'rgba(8,47,73,0.6)'; g.lineWidth = 2; g.stroke();
    // Sit the number on the triangle's centroid, so it stays inside the solid half
    // whichever way the slope leans.
    const nx = b.type === 'rampA' ? x + w * 0.63 : x + w * 0.37;
    const ny = y + h * 0.68;
    g.font = '800 13px system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(8,47,73,0.85)';
    g.strokeText(b.hp, nx, ny);
    g.fillStyle = '#fff';
    g.fillText(b.hp, nx, ny);
    if (flash) {
      g.beginPath();
      if (b.type === 'rampA') {
        g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w, y);
      } else {
        g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x, y);
      }
      g.closePath();
      g.fillStyle = 'rgba(255,255,255,' + (flash * 0.7).toFixed(2) + ')'; g.fill();
    }
    return;
  }
  if (b.type === 'bomb') {
    // No tile plate behind it — the bomb itself is the whole tile. That means the
    // body has to carry its own contrast against the near-black board: a lit rim
    // and a highlight, rather than the near-black casing a plate could sit on.
    const cy = my + 2, rad = w * 0.36;
    g.fillStyle = '#334155';
    g.beginPath(); g.arc(mx, cy, rad, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7c8ba1'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.arc(mx - rad * 0.3, cy - rad * 0.34, rad * 0.42, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f59e0b'; g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(mx + rad * 0.6, cy - rad * 0.8);
    g.quadraticCurveTo(mx + 11, my - 15, mx + 15, my - 12);
    g.stroke();
    g.fillStyle = '#fde047';
    g.beginPath(); g.arc(mx + 16, my - 12, 3, 0, Math.PI * 2); g.fill();
    if (flash) {
      g.fillStyle = 'rgba(255,255,255,' + (flash * 0.8).toFixed(2) + ')';
      g.beginPath(); g.arc(mx, cy, rad, 0, Math.PI * 2); g.fill();
    }
    return;
  }
  if (b.type === 'orb') {
    g.beginPath(); g.arc(mx, my, w / 2, 0, Math.PI * 2);
    g.fillStyle = tileColor(b); g.fill();
    g.strokeStyle = 'rgba(15,23,42,0.55)'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(mx, my, w / 2 - 5, Math.PI * 0.95, Math.PI * 1.65); g.stroke();
    g.fillStyle = '#fff';
    g.font = '800 12px system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.hp, mx, my + 1);
    if (flash) {
      g.beginPath(); g.arc(mx, my, w / 2, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,' + (flash * 0.7).toFixed(2) + ')'; g.fill();
    }
    return;
  }
  rr(g, x, y, w, h, 9);
  g.fillStyle = tileColor(b); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 2; g.stroke();
  rr(g, x + 3, y + 3, w - 6, h * 0.32, 6);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
  if (b.type === 'gift') {
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 19px system-ui,sans-serif';
    g.fillText('?', mx, my - 4);
    g.font = '700 11px system-ui,sans-serif';
    g.fillText(b.hp, mx, my + 11);
  } else if (b.type === 'mult') {
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 14px system-ui,sans-serif';
    g.fillText('×2', mx, my - 4);
    g.font = '700 11px system-ui,sans-serif';
    g.fillText(b.hp, mx, my + 10);
  } else if (b.type === 'pierce') {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(mx - 9, my - 10); g.lineTo(mx - 2, my - 3); g.lineTo(mx - 9, my + 4); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(mx + 1, my - 10); g.lineTo(mx + 8, my - 3); g.lineTo(mx + 1, my + 4); g.closePath(); g.fill();
    g.font = '700 11px system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.hp, mx, my + 11);
  } else if (b.type === 'blast') {
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? 8 : 3.4;
      const px = mx + Math.cos(a) * rad, py = my - 4 + Math.sin(a) * rad;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.font = '700 11px system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.hp, mx, my + 11);
  } else {
    g.fillStyle = '#fff';
    g.font = '800 ' + (b.hp > 99 ? 12 : b.hp > 9 ? 15 : 17) + 'px system-ui,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.hp, mx, my + 1);
  }
  if (flash) {
    rr(g, x, y, w, h, 9);
    g.fillStyle = 'rgba(255,255,255,' + (flash * 0.8).toFixed(2) + ')'; g.fill();
  }
}

// The green (+) ball pickup. `phase` drives the idle pulse (pass 0 for a still frame).
function paintPickup(g, x, y, r, phase) {
  const pulse = 1 + Math.sin(phase || 0) * 0.12;
  g.strokeStyle = 'rgba(52,211,153,' + (0.35 * pulse).toFixed(2) + ')';
  g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, r * pulse + 4, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#34d399';
  g.beginPath(); g.arc(x, y, r * pulse, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 3.5;
  g.beginPath();
  g.moveTo(x - 7, y); g.lineTo(x + 7, y);
  g.moveTo(x, y - 7); g.lineTo(x, y + 7);
  g.stroke();
}
