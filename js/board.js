'use strict';
function mkBrick(x, y, hp, type) {
  return { uid: uidSeq++, x, y, w: BSIZE, h: BSIZE, hp, maxHp: hp, type: type || 'normal', flash: 1, dead: false };
}
function mkPickup(x, y) {
  return { x: x + BSIZE / 2, y: y + BSIZE / 2, r: 14, seed: Math.random() * 6 };
}

const CH = { B: 'bomb', G: 'gift', M: 'mult', P: 'pierce', X: 'blast', '/': 'rampA', '\\': 'rampB', O: 'orb' };
const STENCILS = [
  [
    '.###.....###.',
    '#############',
    '#############',
    '.###########.',
    '..#########..',
    '...#######...',
    '....#####....',
    '.....#M#.....'
  ],
  [
    '..#.......#..',
    '...#.....#...',
    '..#########..',
    '.##..O.O..##.',
    '#############',
    '#.#########.#',
    '#.#.......#.#',
    '....##.##....'
  ],
  [
    '......#......',
    '.....###.....',
    '....#####....',
    '...#######...',
    '..#########..',
    '.###########.',
    '######G######',
    '.###########.',
    '..#########..'
  ],
  [
    'P.P..#.#..P.P',
    '#############',
    '###...#...###',
    '###...#...###',
    '##XX#####XX##'
  ],
  [
    '\\.........../',
    '.\\........./.',
    '..\\......./..',
    '...\\...../...',
    '....\\.../....',
    '.....\\O/.....',
    '......O......'
  ],
  [
    '###.......###',
    '####..X..####',
    '###.#.#.#.###',
    '.###########.',
    '..#########..'
  ],
  [
    '......#......',
    '.....###.....',
    '....#####....',
    '...#######...',
    '..#########..',
    '.###########.',
    '..#########..',
    '...#######...',
    '....#####....'
  ],
  [
    '......#......',
    '.....###.....',
    '#####...#####',
    '.###########.',
    '..####M####..',
    '..##.....##..',
    '##.........##'
  ],
  [
    '.....###.....',
    '.....###.....',
    '#####X#X#####',
    '.....###.....',
    '.....###.....'
  ],
  [
    '...##...##...',
    '..####.####..',
    '###..###..###',
    '####..O..####',
    '###..###..###',
    '..####.####..',
    '...##...##...'
  ],
  [
    '#..#.....#..#',
    '##.##...##.##',
    '#############',
    '######G######',
    '.###########.'
  ],
  [
    '..#########..',
    '.###########.',
    '###..###..###',
    '###..###..###',
    '####..X..####',
    '.##..###..##.',
    '...#######...'
  ],
  [
    '...#######...',
    '..#########..',
    '##..#####..##',
    '##..##G##..##',
    '.###########.',
    '..#.#.#.#.#..'
  ],
  [
    '.....#X#.....',
    '....#####....',
    '..#########..',
    '#############',
    '#..O.....O..#'
  ],
  [
    '......#......',
    '.....###.....',
    '....#####....',
    '####X###X####',
    '####..M..####',
    '.####...####.'
  ],
  [
    '.....###.....',
    '.....#.#.....',
    '......#......',
    '#############',
    '......#......',
    'P.....#.....P',
    '##....#....##'
  ],
  [
    '....######...',
    '...###.......',
    '..#######....',
    '......####...',
    '.....###.....',
    '....##.......',
    '...##........'
  ],
  [
    '...######....',
    '..##....###..',
    '........###..',
    '.......###...',
    '......###....',
    '......###....',
    '.............',
    '......###....'
  ],
  [
    '#..#.....#..#',
    '.#..#...#..#.',
    '..##.#.#.##..',
    '.#####O#####.',
    '..#########..',
    '.#..#.#.#..#.',
    '#...#...#...#'
  ]
];

// Stencil art alone leaves the exotic kinds far too rare (ramps live in a single
// stencil, pierce in two), so every board also seeds them directly. Each kind
// unlocks at `from`, rolls `chance` per level, and is skipped when the drawn
// stencils already supply `cap` of that kind.
const RARE_MIX = [
  { type: 'blast', from: 3, chance: 0.55, lo: 1, hi: 2, cap: 2 },
  { type: 'pierce', from: 5, chance: 0.5, lo: 1, hi: 2, cap: 2 },
  { type: 'orb', from: 7, chance: 0.5, lo: 1, hi: 3, cap: 3 },
  { type: 'ramp', from: 10, chance: 0.45, lo: 2, hi: 4, cap: 4 }
];

function isKind(b, type) {
  return type === 'ramp' ? b.type === 'rampA' || b.type === 'rampB' : b.type === type;
}

function seedRares(lvl) {
  for (const m of RARE_MIX) {
    if (lvl < m.from || Math.random() >= m.chance) continue;
    if (bricks.filter(b => isKind(b, m.type)).length >= m.cap) continue;
    const pool = bricks.filter(b => b.type === 'normal');
    let n = randInt(m.lo, m.hi);
    while (n-- > 0 && pool.length) {
      const k = pool.splice(randInt(0, pool.length - 1), 1)[0];
      k.type = m.type === 'ramp' ? (Math.random() < 0.5 ? 'rampA' : 'rampB') : m.type;
    }
  }
}

function generateLevel(lvl) {
  bricks.length = 0; pickups.length = 0;
  const lo = Math.max(1, Math.round(lvl * 0.8));
  const hi = Math.max(lo + 2, Math.round(lvl * 1.7));
  const bombP = Math.min(0.02 + lvl * 0.0005, 0.04);
  const arts = [randInt(0, STENCILS.length - 1)];
  let used = STENCILS[arts[0]].length;
  const maxRows = Math.floor((DANGER_Y - 3 * CELL - BSIZE) / CELL);
  if (lvl >= 8 && Math.random() < 0.65) {
    const j = randInt(0, STENCILS.length - 1);
    if (j !== arts[0] && used + 1 + STENCILS[j].length <= maxRows) { arts.push(j); used += 1 + STENCILS[j].length; }
  }
  const minOy = -Math.min(4, used - 1);
  const maxOy = Math.max(minOy, maxRows - used);
  let oy = randInt(minOy, maxOy);
  for (const ai of arts) {
    const rows = STENCILS[ai];
    const w = rows[0].length;
    const ox = Math.floor((COLS - w) / 2);
    const mir = Math.random() < 0.5;
    for (let r = 0; r < rows.length; r++) {
      const line = rows[r];
      for (let i = 0; i < w; i++) {
        const ch = mir ? line[w - 1 - i] : line[i];
        if (ch === '.') continue;
        let type;
        if (ch === '#') {
          const roll = Math.random();
          type = roll < bombP ? 'bomb' : roll < bombP + 0.03 ? 'gift' : roll < bombP + 0.07 ? 'mult' : 'normal';
        } else type = CH[ch];
        let hp = randInt(lo, hi);
        if (Math.random() < 0.12) hp = Math.round(hp * 1.5);
        bricks.push(mkBrick((ox + i) * CELL + GAP, (oy + r) * CELL + GAP, hp, type));
      }
    }
    oy += rows.length + 1;
  }
  seedRares(lvl);
  let pb = randInt(1, 3);
  const normals = bricks.filter(b => b.type === 'normal');
  while (pb-- > 0 && normals.length) {
    const k = normals.splice(randInt(0, normals.length - 1), 1)[0];
    const idx = bricks.indexOf(k);
    if (idx >= 0) { bricks.splice(idx, 1); pickups.push(mkPickup(k.x, k.y)); }
  }
  captureCheckpoint();
}
