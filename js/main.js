'use strict';
let last = performance.now(), bgTimer = null;

function step(dt) {
  if (mode !== 'over') update(dt);
  saveTimer += dt;
  if (saveDirty && saveTimer > 0.5) { saveTimer = 0; saveNow(); }
}

function turnActive() {
  return mode === 'shooting' || mode === 'shifting' || mode === 'between';
}

function pump(dt) {
  const n = Math.max(1, Math.ceil(dt / 0.02));
  const s = dt / n;
  for (let i = 0; i < n; i++) step(s);
}

function frame(now) {
  requestAnimationFrame(frame);
  if (bgTimer !== null) { last = now; return; }
  pump(clamp((now - last) / 1000, 0, 0.25));
  last = now;
  syncActions();
  draw();
}

function bgTick() {
  pump(clamp((performance.now() - last) / 1000, 0, 30));
  last = performance.now();
  if (!turnActive()) stopBg();
}

function startBg() { if (bgTimer === null) bgTimer = setInterval(bgTick, 200); }
function stopBg() {
  if (bgTimer !== null) {
    clearInterval(bgTimer);
    bgTimer = null;
    last = performance.now();
  }
}

applyMuteIcon();
if (loadSaved()) {
  if (!bricks.length) generateLevel(level);
  banner('LEVEL ' + level);
} else {
  generateLevel(1);
  banner('LEVEL 1');
}
updateHud();
window.addEventListener('pagehide', () => { if (mode !== 'over') saveNow(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (mode !== 'over') saveNow();
    if (turnActive()) startBg();
  } else {
    stopBg();
  }
});
requestAnimationFrame(frame);
