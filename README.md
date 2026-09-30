# 🐶 Woofdoku

A web-based, dog-themed take on the mobile logic puzzle **Meowdoku**, extended with **bonus mini-game levels** (every 5th level) that award **power-ups** for the main puzzle.

> Status: **Playable MVP** — roadmap Phases 0–3 are implemented (plus much of Phase 4's UI): 100 levels in 4 worlds, 80 generated logic puzzles, 3 bonus mini-games, 8 power-ups, a treat shop, and save/export.

## Run it

```bash
npm install
npm run dev              # start the dev server (http://localhost:5173)
npm test                 # unit tests (Vitest)
npm run typecheck        # TypeScript strict check
npm run build            # production build into dist/
npm run generate-levels  # regenerate src/data/puzzles.json (deterministic seed)
```

## Code layout

| Path | Purpose |
|------|---------|
| `src/core/puzzle/` | Puzzle types, exact solver, human-style logic solver (hints/grading), generator, game reducer |
| `src/core/economy/` | Power-up definitions/effects, bonus reward rolls |
| `src/core/progression/` | Worlds, level table, bonus schedule, puzzle slot sizes/difficulty |
| `src/data/` | Pre-generated puzzle pack (`puzzles.json`) |
| `src/minigames/` | Bonus mini-games (pure `logic.ts` + React view each) and the registry |
| `src/store/` | Zustand stores: persisted save data and screen navigation |
| `src/ui/` | Board, dog SVGs, power-up tray and all screens |
| `scripts/generate-levels.ts` | Offline level generator |

## Documents

| # | File | What's inside |
|---|------|---------------|
| 1 | [docs/01-research-meowdoku.md](docs/01-research-meowdoku.md) | Research on the original game: rules, controls, progression, monetization, what makes it fun |
| 2 | [docs/02-core-game-design.md](docs/02-core-game-design.md) | Woofdoku core puzzle: rules, controls, lives, stars, hints, win/lose flow |
| 3 | [docs/03-bonus-levels.md](docs/03-bonus-levels.md) | Bonus mini-games (Block Drop, Connect the Dots, Sliding Pup, etc.), rules & scoring |
| 4 | [docs/04-powerups-economy.md](docs/04-powerups-economy.md) | Power-ups, currency (bones), inventory, reward tables, balancing |
| 5 | [docs/05-level-progression.md](docs/05-level-progression.md) | World/chapter structure, difficulty curve, bonus cadence, unlocks |
| 6 | [docs/06-technical-architecture.md](docs/06-technical-architecture.md) | Tech stack, folder structure, level generator + solver, state, persistence, testing |
| 7 | [docs/07-art-audio-ux.md](docs/07-art-audio-ux.md) | Visual style, dog characters, palette, accessibility, animations, sound |
| 8 | [docs/08-roadmap.md](docs/08-roadmap.md) | Phased milestones, tasks, acceptance criteria, risks |
| 9 | [docs/09-open-questions.md](docs/09-open-questions.md) | Decisions we should confirm before building |

## One-paragraph pitch

Place one dog in every row, every column and every colored yard — and dogs don't like each other's personal space, so no two dogs may touch, not even diagonally. Every puzzle has exactly one solution reachable by pure logic. Every 5th level is a **Bonus Park**: a short, brainy mini-game (block puzzle, connect-the-dots, sliding tiles, …). Doing well there earns power-ups such as **Sniff** (reveal a dog), **Bone Shield** (absorb one mistake) and **Fetch** (auto-cross a row) that make the main puzzles easier.

## Assumptions made while planning

- Name: **Woofdoku** (placeholder, easy to change).
- Single-player, offline-capable, **no ads / no real-money purchases** (it's a fan/personal project).
- Desktop + mobile browsers, touch-first, installable as a PWA.
- Stack: **Vite + TypeScript + React**, no heavy game engine; Canvas only where a mini-game benefits from it.
- Levels are **pre-generated** by our own generator/solver and shipped as JSON (with an optional "endless" mode generating on the fly later).
