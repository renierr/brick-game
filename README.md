# Bricks And Balls Crusher

A browser clone of the classic brick-breaker *Bricks And Balls Crusher*: aim a volley of bouncing balls, crush numbered bricks, and ride endlessly through self-generating levels.

## Play

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
- **Special tiles**:
  - **Bombs** explode on any hit, destroying all neighboring bricks — chain them for cascades.
  - **Gift (?)** tiles trigger a **random power-up** when destroyed — +10 balls, Pierce Volley, Bomb Volley, or Clear Row.
  - **×2 multiplier** tiles pay double points when destroyed.
  - **Pierce (») tiles** grant a piercing charge — charges stack, one drilling ball per charge in your next volley.
  - **Blast tiles** grant a bomb charge — charges stack, one explosive ball per charge in your next volley.

### Level Design

The board is a seamless **13-column grid** — tiles sit flush against each other with no gap. Every layout is cut from one of twelve hand-drawn stencils, auto-centered on the grid, and randomly mirrored.

**Spawn rules**

- A clear zone (~3 rows) above the danger line is guaranteed — layouts never start inside your launch area, so every tile is reachable.
- Tall compositions may begin with up to **4 rows hidden above the top edge**; those slide into view one row per turn. At least one row is always visible — a board is never fully off-screen.
- From **level 8**, two stencils usually stack vertically into one bigger composition when space allows.
- Brick HP scales forever with the level, and ~12% of tiles get a ×1.5 reinforcement.
- Plain slots roll bonuses: bombs ≈2–4% (grows slowly), gifts 3%, ×2 multipliers 4%. On top of that, 1–3 plain tiles are swapped for green (+) pickups.

**Tile legend**

    #   numbered brick        B   bomb             G   gift (?)
    M   ×2 multiplier         P   pierce tile      X   blast tile
    /   ramp deflector (\)    O   orb bumper       .   empty space

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

There is no final level — only your best score.

### Power-ups

Open the grid menu for unlimited-use power-ups:

| Power-up | Effect |
| --- | --- |
| +10 Balls | Adds 10 balls to your stash (soft cap 150 — trimmed back to 100 at each level clear) |
| Pierce Volley | Adds one piercing charge — a drill-through ball in your next volley |
| Bomb Volley | Adds one bomb charge — its ball blasts neighbors for max 50 damage |
| Clear Row | Wipes the lowest brick row |

**Charges stack**: catch several pierce/blast tiles (or tap the menu repeatedly) and several balls of your next volley inherit the effect — consumed one per ball as the volley fires.

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
