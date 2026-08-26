'use strict';
function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}
let bricks = [], pickups = [], balls = [], particles = [], texts = [], rings = [];
let level = 1, score = 0, totalBalls = 1, originX = W / 2;
let best = +(storageGet('bbc_best') || 0);
let muted = storageGet('bbc_mute') === '1';
let mode = 'aiming', uidSeq = 1, timeSec = 0;
let pendingShots = 0, volleyDir = { x: 0, y: -1 }, volleyAcc = 0, volleyElapsed = 0, firstLandX = null;
let pierceCharges = 0, bombCharges = 0, pierceLeft = 0, bombLeft = 0;
let shiftT = 0, betweenTimer = 0, hintAlpha = 1, shake = 0, firedOnce = false;
let aiming = false, aimPt = null;
let speedMult = 1, autoSped = false;
let saveDirty = false, saveTimer = 0;
let checkpoint = null;

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOut = t => 1 - (1 - t) * (1 - t);

