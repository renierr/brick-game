'use strict';
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
