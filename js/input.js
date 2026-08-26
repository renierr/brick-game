'use strict';
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
$('restartBtn').addEventListener('click', retryLevel);
$('retryBtn').addEventListener('click', retryLevel);
$('startOverBtn').addEventListener('click', resetGame);
speedBtn.addEventListener('click', () => {
  ensureAudio();
  if (mode !== 'shooting' || speedMult >= MAX_SPEED) return;
  speedMult = Math.min(MAX_SPEED, speedMult + SPEED_BOOST);
  addText(W / 2, TOAST_Y, 'SPEED x' + speedMult, '#fbbf24', 1, 17);
  sfx.arm();
});
recallBtn.addEventListener('click', () => {
  ensureAudio();
  if (mode === 'shooting') recallBalls();
});

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
