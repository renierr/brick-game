'use strict';
let bricks = [], pickups = [], balls = [], particles = [], texts = [], rings = [];
let level = 1, score = 0, totalBalls = 1, originX = W / 2;
let best = +(localStorage.getItem('bbc_best') || 0);
let muted = localStorage.getItem('bbc_mute') === '1';
let mode = 'aiming', uidSeq = 1, timeSec = 0;
let pendingShots = 0, volleyDir = { x: 0, y: -1 }, volleyAcc = 0, volleyElapsed = 0, firstLandX = null;
let pierceArmed = false, bombArmed = false, pierceFlag = false, bombFlag = false;
let shiftT = 0, betweenTimer = 0, hintAlpha = 1, shake = 0, firedOnce = false;
let aiming = false, aimPt = null;
let speedMult = 1, autoSped = false;
let saveDirty = false, saveTimer = 0;
let checkpoint = null;

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOut = t => 1 - (1 - t) * (1 - t);

function colorByHp(hp) {
  const t = Math.min(1, (hp - 1) / 49);
  return 'hsl(' + Math.round(30 + t * 255) + ' 72% ' + Math.round(52 - t * 8) + '%)';
}
