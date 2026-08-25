'use strict';
const W = 480, H = 760, COLS = 13, CELL = W / COLS, GAP = 0, BSIZE = CELL - GAP * 2;
const LAUNCH_Y = H - 34, DANGER_Y = H - 80;
const BALL_R = 7, BALL_SPEED = 560, STAGGER_MS = 70, MAX_VOLLEY_S = 25;
const MIN_ANGLE = Math.PI / 20, MAX_BALLS = 150, VOLLEY_CAP = 100, SHIFT_S = 0.22;
const SPEED_BOOST = 3, AUTO_SPEED_AFTER = 6, MAX_SPEED = 10;

const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = W * dpr; cv.height = H * dpr;

const scoreEl = $('score'), bestEl = $('best'), lvEl = $('lv'), ballsEl = $('balls');
const overlayEl = $('overlay'), finalScoreEl = $('finalScore'), finalBestEl = $('finalBest');
const powerOverlay = $('powerOverlay'), bannerEl = $('banner'), hintEl = $('hint');
const muteLine = $('muteLine'), speedBtn = $('speedBtn'), recallBtn = $('recallBtn');
