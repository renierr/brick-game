'use strict';
let last = performance.now(), bgTimer = null;
let wakeLock = null, wakeWanted = false, wakePending = false;

const stageEl = $('stage');
function fitStage() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight;
  if (!w || !h) return;
  const s = Math.min(w / W, h / H);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
fitStage();

function step(dt) {
  if (mode !== 'over') update(dt);
  saveTimer += dt;
  if (saveDirty && saveTimer > 0.5) { saveTimer = 0; saveNow(); }
}

function turnActive() {
  return mode === 'shooting' || mode === 'shifting' || mode === 'between';
}

// Keep the display awake while a turn plays itself out — a volley can run for
// tens of seconds without any touch input, which is long enough for a phone to
// dim and lock. The lock is dropped as soon as we are back to aiming.
function acquireWake() {
  if (wakeLock || wakePending || !('wakeLock' in navigator) || document.hidden) return;
  wakePending = true;
  navigator.wakeLock.request('screen').then(l => {
    wakePending = false;
    if (!wakeWanted) { l.release().catch(() => {}); return; }
    wakeLock = l;
    l.addEventListener('release', () => { if (wakeLock === l) wakeLock = null; });
  }).catch(() => { wakePending = false; });
}

function releaseWake() {
  const l = wakeLock;
  wakeLock = null;
  if (l) l.release().catch(() => {});
}

function syncWake() {
  const want = turnActive() && mode !== 'over';
  wakeWanted = want;
  if (want) acquireWake(); else releaseWake();
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
  syncWake();
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
    // The browser revokes the lock whenever the page is hidden; take it back.
    if (wakeWanted) acquireWake();
  }
});
requestAnimationFrame(frame);
