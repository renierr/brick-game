'use strict';
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (mode !== 'over') update(dt);
  saveTimer += dt;
  if (saveDirty && saveTimer > 0.5) { saveTimer = 0; saveNow(); }
  syncActions();
  draw();
  requestAnimationFrame(frame);
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
document.addEventListener('visibilitychange', () => { if (document.hidden && mode !== 'over') saveNow(); });
requestAnimationFrame(frame);
