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
- **Release to fire** your whole arsenal at once; balls stagger out and ricochet off walls and bricks.
- Every brick shows its **HP**; each hit removes 1. At 0 the brick shatters for points.
- After every volley the board **drops one row**. If any brick crosses the red danger line, the run ends.
- Clear the entire board to complete the level: score bonus, +2 balls, and a freshly generated next level.
- Green **(+)** pickups are collected on touch and permanently add a ball.
- **Bombs** explode on any hit, destroying all neighboring bricks — chain them for cascades.

### Levels

Levels are procedurally generated forever from pattern templates (checkerboard, pyramid, diamond, weave, stripes) with scaling HP, density, and bomb frequency. There is no final level — only your best score.

### Power-ups

Open the grid menu for unlimited-use power-ups:

| Power-up | Effect |
| --- | --- |
| +10 Balls | Instantly adds 10 balls |
| Pierce Volley | Next volley drills straight through bricks |
| Bomb Volley | Next volley explodes on every impact |
| Clear Row | Wipes the lowest brick row |

### Action buttons

- **Recall** (bottom-left, during a volley): instantly pulls all balls back so a stuck shot can never trap you.
- **Speed x3** (bottom-right, during a volley): triples ball speed until the turn ends. Kicks in automatically if a volley drags past 6 seconds.

### Progress

Level, score, ball count, and the current board layout are auto-saved to browser storage — close the tab mid-level and resume where you left off. Best score persists across runs.

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
