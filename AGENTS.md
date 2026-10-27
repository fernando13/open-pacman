# AGENTS.md

Pac-Man clone in vanilla JS + canvas, used as a spec-driven development exercise. No package manager, build step, tests, or linter.

## Run and verify

- Open `src/index.html` directly in a browser (`file://` works; no server or modules). Optional: `python -m http.server` from `src/`.
- There is no automated test suite. Verify changes manually: load the page, check the console for errors, then start a game and exercise the changed behavior.
- Do not add npm/build/tooling for small changes; the project is intentionally dependency-free.

## Architecture

- `src/index.html` loads four classic scripts in a required order: `maze.js` -> `game.js` -> `render.js` -> `main.js` (also the dependency order). There are no ES modules.
- Files communicate through globals explicitly exported at the bottom (`window.MAZE`, `window.createGame`, `window.update`, `window.draw`, `window.DIRS`). A new file must be added to `index.html` and export/import this way; switching to `import`/`export` breaks the page.
- `main.js`: DOM wiring, keyboard, overlay screens, and the single `requestAnimationFrame` loop. `update()` only runs while `game.state === 'playing'`; states are `start`, `playing`, `won`, `lost`.
- `game.js`: game state and rules (movement, ghost AI, collisions, win/lose). `render.js`: canvas drawing only. `maze.js`: static maze data only.
- Positions and speeds are in **cells/frame**, not pixels: Pac-Man `0.125`, ghosts `0.1`. Alignment to grid cells uses a `1e-3` tolerance; turning/decisions only happen on aligned cells.
- Canvas is exactly 28x31 cells at `TILE = 20` (560x620). Keep `TILE`, canvas size, `#game-wrap` in `style.css`, and maze dimensions in sync.

## Maze and data conventions

- `MAZE_STR` in `maze.js` is the source of truth: 31 strings of 28 chars. `MAZE` is the parsed, immutable version; each `createGame()` copies it into `game.grid` so eaten dots can be reset. Render from `game.grid`, never `MAZE`.
- Tile values: `1` wall, `2` dot, `3` ghost-pen door, `0` walkable/empty. Pac-Man is blocked by walls and doors; ghosts are blocked only by walls.
- Special constants live in `maze.js`: `TUNNEL_ROW` (14), `PACMAN_START`, `GHOST_STARTS`. Tunnel wrapping only applies on `TUNNEL_ROW`; moving off the left/right edge there is legal.
- Eating a dot is worth 10 points and decrements `dotsRemaining`; lose a life on collision, reset actors, and game over at 0 lives.

## Conventions

- Comments and UI copy are in Spanish (the README too); keep new user-facing strings and comments in Spanish.
- Code style: single quotes, semicolons, 2-space indent, and spaces inside parentheses/call args (e.g. `if ( !dir ) return;`, `grid[ y ][ x ]`). Follow it in touched files.
- See `.agents/skills/spec/SKILL.md` and `.agents/skills/spec-impl/SKILL.md` for the `/spec` and `/spec-impl` workflow. Specs live in `specs/NN-slug.md` (folder not created yet); `spec-impl` refuses anything whose status is not "Approved"/"Aprobado" and creates branch `spec-NN-slug` unless `specs/.spec-config.yml` sets `AutoCreateBranch: false`. Never set a spec to Approved yourself.
