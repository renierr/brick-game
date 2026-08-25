'use strict';
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
