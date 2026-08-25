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

### Levels

Levels are assembled on an auto-centered grid from hand-drawn stencils — hearts, invaders, gems, castles, deflector funnels, butterflies — randomly mirrored, sprinkled with specials, and stacked into bigger compositions from level 8. HP scales forever; there is no final level — only your best score.

### Power-ups

Open the grid menu for unlimited-use power-ups:

| Power-up | Effect |
| --- | --- |
| +10 Balls | Instantly adds 10 balls to your stash (stash caps at 200) |
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

## License

[MIT](LICENSE)
