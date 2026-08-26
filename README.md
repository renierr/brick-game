# Bricks And Balls Crusher

A browser clone of the classic brick-breaker *Bricks And Balls Crusher*: aim a volley of bouncing balls, crush numbered bricks, and ride endlessly through self-generating levels.

## Play

[renierr.github.io/brick-game/](https://renierr.github.io/brick-game/)

Open `index.html` in any modern browser, or serve the folder:

```sh
npx serve .
```

No build step, no dependencies.

## Gameplay

- **Drag anywhere to aim** — a dashed preview shows the trajectory and first impact.
- **Release to fire** — up to **100 balls launch per turn** (staggered), ricocheting off walls and bricks. Menu power-ups and caught pickups keep growing your stash beyond that for later turns.
- Every brick shows its **HP**; each hit removes 1. At 0 the brick shatters for points.
- After every volley the board **drops one row**. If any brick crosses the red danger line, the run ends.
- Clear the entire board to complete the level: score bonus, +2 balls, and a freshly generated next level.
- Green **(+)** pickups are collected on touch and permanently add a ball.
- Banked **pierce / bomb charges** show as chips in a **fixed spot** just above the launcher — they stay put wherever the launcher slides to.

### Tile reference

Except the (+) pickup, every tile carries HP and breaks like a normal brick; the effect is what happens *in addition*.

| Tile | Looks like | Effect |
| --- | --- | --- |
| **Brick** | numbered rounded block | Plain target. HP shown; each hit removes 1. Points = `maxHP × 10 + level × 2`. |
| **Bomb** | dark fuse sphere | **Dies to a single hit regardless of HP** and explodes: everything within ~2 cells takes lethal damage. Chains through other bombs. |
| **Gift (?)** | white `?` | On destruction fires one **random power-up**: +10 balls, Pierce charge, Bomb charge, or Clear Row (25% each). |
| **×2 multiplier** | white `×2` | Pays **double points** when destroyed, with its own `+N x2!` popup. |
| **Pierce (»)** | double chevron | Banks a **pierce charge**. One ball of your next volley drills straight through bricks instead of bouncing, damaging each brick it passes once. |
| **Blast** | white starburst | Banks a **bomb charge**. One ball of your next volley explodes on every impact for up to **50 damage** in a radius. |
| **Ramp** | filled triangle | Not a bouncer — a **90° deflector**. Rotates the ball's velocity a quarter turn (`/` and `\` turn opposite ways) and takes 1 damage. Redirects a vertical volley sideways across the board. |
| **Orb** | circle with highlight | A **round bumper**: reflects off its curved surface instead of a flat face, so outgoing angles fan out. Takes 1 damage per bounce. |
| **(+) pickup** | green pulsing plus | Not a brick — no HP, cannot be shot away. Collected on touch, permanently **+1 ball** to your stash. |

Ramps and orbs have a short per-ball cooldown (~0.09 s), so a ball cannot get stuck ping-ponging inside a cluster of them.

**Charges stack**: bank several pierce/blast tiles (or tap the menu repeatedly) and several balls of your next volley inherit the effect — consumed one per ball as the volley fires. A ball can be both pierce *and* bomb.

### Level Design

The board is a seamless **13-column grid** — tiles sit flush against each other with no gap. Every layout is cut from one of nineteen hand-drawn stencils, auto-centered on the grid, and randomly mirrored.

**Spawn rules**

- A clear zone (~3 rows) above the danger line is guaranteed — layouts never start inside your launch area, so every tile is reachable.
- Tall compositions may begin with up to **4 rows hidden above the top edge**; those slide into view one row per turn. At least one row is always visible — a board is never fully off-screen.
- From **level 8**, two stencils usually stack vertically into one bigger composition when space allows.
- Brick HP scales forever with the level, and ~12% of tiles get a ×1.5 reinforcement.
- Finally, 1–3 plain tiles are swapped for green (+) pickups.

**Which tile spawns when**

Special tiles arrive from three independent sources, so no kind is hostage to which stencil got drawn:

1. **Stencil art** — hand-placed accents baked into a layout (the invader's orb eyes, the castle's pierce towers). Drawn only when that stencil comes up.
2. **Per-tile roll** — every plain `#` slot independently rolls for a common bonus.
3. **Rare seeding** — after the art is laid out, each exotic kind gets one chance to convert a handful of plain tiles. This is what keeps ramps and orbs in circulation; without it they lived in a single stencil each. Skipped when the drawn art already supplies enough of that kind.

| Tile | Source | Unlocks at | Rate |
| --- | --- | --- | --- |
| **Bomb** | per-tile roll | level 1 | 2% per plain tile, creeping to a 4% ceiling with level |
| **Gift (?)** | per-tile roll | level 1 | 3% per plain tile |
| **×2 multiplier** | per-tile roll + art | level 1 | 4% per plain tile |
| **Blast** | seeding + art | **level 3** | 55% of boards get 1–2 (cap 2) |
| **Pierce (»)** | seeding + art | **level 5** | 50% of boards get 1–2 (cap 2) |
| **Orb** | seeding + art | **level 7** | 50% of boards get 1–3 (cap 3) |
| **Ramp** | seeding + art | **level 10** | 45% of boards get 2–4, each `/` or `\` at random (cap 4) |
| **(+) pickup** | fixed | level 1 | always 1–3 per board |

Before a kind's unlock level it can still appear, but only if its stencil is drawn — so early levels stay simple and the exotic mechanics ease in as you climb. Measured over the generator, a level-30 board (~54 tiles) carries roughly 2 bombs, 2 gifts, 2 multipliers, 1 blast, 1 pierce, 1–2 orbs and 2 ramps.

**Tile legend** — the characters a stencil may use (`B` for a bomb exists but is left to the
per-tile roll rather than hand-placed):

    #   numbered brick        G   gift (?)         M   ×2 multiplier
    P   pierce tile           X   blast tile       O   orb bumper
    /   ramp deflector        \   ramp deflector   .   empty space

**Stencil gallery**

Heart — an ×2 tucked into the tip:

    .###.....###.
    #############
    #############
    .###########.
    ..#########..
    ...#######...
    ....#####....
    .....#M#.....

Invader — orb-bumper eyes:

    ..#.......#..
    ...#.....#...
    ..#########..
    .##..O.O..##.
    #############
    #.#########.#
    #.#.......#.#
    ....##.##....

Gem — a gift core:

    ......#......
    .....###.....
    ....#####....
    ...#######...
    ..#########..
    .###########.
    ######G######
    .###########.
    ..#########..

Castle — pierce towers, blast-tile flanks:

    P.P..#.#..P.P
    #############
    ###...#...###
    ###...#...###
    ##XX#####XX##

Funnel — ramps steering balls into waiting orbs:

    \.........../
    .\........./.
    ..\......./..
    ...\...../...
    ....\.../....
    .....\O/.....
    ......O......

Butterfly — blast-tile head:

    ###.......###
    ####..X..####
    ###.#.#.#.###
    .###########.
    ..#########..

Diamond — the classic rhombus:

    ......#......
    .....###.....
    ....#####....
    ...#######...
    ..#########..
    .###########.
    ..#########..
    ...#######...
    ....#####....

Star — ×2 multiplier core:

    ......#......
    .....###.....
    #####...#####
    .###########.
    ..####M####..
    ..##.....##..
    ##.........##

Cross — blast tiles on the arms:

    .....###.....
    .....###.....
    #####X#X#####
    .....###.....
    .....###.....

Flower — orb-bumper heart:

    ...##...##...
    ..####.####..
    ###..###..###
    ####..O..####
    ###..###..###
    ..####.####..
    ...##...##...

Crown — gift jewel in the band:

    #..#.....#..#
    ##.##...##.##
    #############
    ######G######
    .###########.

Skull — blast-tile nose:

    ..#########..
    .###########.
    ###..###..###
    ###..###..###
    ####..X..####
    .##..###..##.
    ...#######...

Ghost — gift between the eyes, tattered skirt:

    ...#######...
    ..#########..
    ##..#####..##
    ##..##G##..##
    .###########.
    ..#.#.#.#.#..

UFO — blast dome, orb tractor-lights:

    .....#X#.....
    ....#####....
    ..#########..
    #############
    #..O.....O..#

Rocket — blast boosters, ×2 porthole:

    ......#......
    .....###.....
    ....#####....
    ####X###X####
    ####..M..####
    .####...####.

Anchor — pierce-tile flukes:

    .....###.....
    .....#.#.....
    ......#......
    #############
    ......#......
    P.....#.....P
    ##....#....##

Lightning bolt:

    ....######...
    ...###.......
    ..#######....
    ......####...
    .....###.....
    ....##.......
    ...##........

Question mark:

    ...######....
    ..##....###..
    ........###..
    .......###...
    ......###....
    ......###....
    .............
    ......###....

Spider — orb eye in the body:

    #..#.....#..#
    .#..#...#..#.
    ..##.#.#.##..
    .#####O#####.
    ..#########..
    .#..#.#.#..#.
    #...#...#...#

There is no final level — only your best score.

### Power-ups

Open the grid menu for unlimited-use power-ups:

| Power-up | Effect |
| --- | --- |
| +10 Balls | Adds 10 balls to your stash (soft cap 150 — trimmed back to 100 at each level clear) |
| Pierce Volley | Adds one piercing charge — a drill-through ball in your next volley |
| Bomb Volley | Adds one bomb charge — its ball blasts neighbors for max 50 damage |
| Clear Row | Wipes the lowest brick row |

These bank the same charges the pierce and blast tiles do — see [Tile reference](#tile-reference). Whatever is banked shows as a chip above the launcher until the volley spends it.

### Action buttons

- **Recall** (bottom-left, during a volley): instantly pulls all balls back so a stuck shot can never trap you.
- **Speed** (bottom-right, during a volley): each press stacks another boost — x3, x6, x9, then x10 max — until the turn ends. Auto-kicks in at x3 if a volley drags past 6 seconds.

### Progress

Level, score, ball count, and the current board layout are auto-saved to browser storage — close the tab mid-level and resume where you left off. Best score persists across runs. Volleys finish resolving in real time even if the tab goes hidden or you switch away mid-turn.

On game over you can **Retry Level** (default — the board is restored exactly as it looked when the level began) or **Start Over** from level 1. The restart button in the top bar also replays the current level from its start.

## Controls

| Input | Action |
| --- | --- |
| Drag / release | Aim and fire |
| Recall button | Return balls, end turn |
| Speed button | Fast-forward current volley |
| Grid button | Power-up menu |
| Restart button | Replay current level from its start |

## Tech

Vanilla HTML5 Canvas + Web Audio. The code is split by concern under `js/` (`config`, `state`, `audio`, `fx`, `board`, `actions`, `sim`, `render`, `progress`, `input`, `main`) and loaded with plain `<script>` tags sharing globals — no modules, no bundler, no build step; opening `index.html` straight from disk works. Fixed 480x760 logical resolution scaled to fit any screen; sub-stepped circle/AABB physics keeps fast volleys tunnel-free.

Headless smoke tests live in the repo root (not part of the game itself) — run them with Node, zero dependencies:

```sh
node smoke.mjs
node special-smoke.mjs
```

## License

[MIT](LICENSE)
