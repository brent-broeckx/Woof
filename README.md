# 🐶 Woofdoku

A web-based, dog-themed take on the mobile logic puzzle **Meowdoku**, extended with **bonus mini-game levels** (every 5th level) that award **power-ups** for the main puzzle.

> Status: **Feature-complete v1 candidate** — roadmap Phases 0–6 implemented: 100 levels in 4 worlds, 80 generated logic puzzles, **10 bonus mini-games**, 8 power-ups, world chests, cosmetics (board themes & dog outfits), Daily puzzle with streaks, Endless mode, stats, sound/music/haptics, accessibility options and an installable offline PWA. **Meta (in progress, see doc 10):** adopt a main pup, earn 🥣 kibble from every win and feed it to keep it happy, build bond levels and unlock tricks. Your pup lives in the **🏡 Yard**, filling a treat jar every hour (faster when happy, capped at 12 h) — treats now come from the yard and chests rather than puzzle wins. Grow a **🐕 Pack**: each world chest rescues a story dog, and the **🎪 Adoption Fair** trades treats for a random breed (odds shown, pity after 10). Duplicates and training level dogs up, and every dog adds to the yard's production. Send up to 3 teams on **🧭 Expeditions** (1/4/8 h) to world-themed destinations for treats, power-ups and **📮 postcards** — dogs on a trip don't produce at home, and full postcard sets pay a bonus. Replay any unlocked mini-game in the **🕹️ Arcade** at four difficulties for medals, personal bests and a daily-capped kibble reward. Chase **🏅 Badges** (bronze/silver/gold tiers with kibble, treats and badge-only outfits) take on the **🏔️ Weekly Boss**, a very hard 10×10 puzzle that changes every week, explore **❄️ Snowy Woods** (World 5) and solve twist puzzles in the **🐈 Cat Café**, where sleeping cats block cells.

## Run it

```bash
npm install
npm run dev              # start the dev server (http://localhost:5173)
npm run dev:mobile       # same, but reachable from your phone on the same Wi-Fi
npm test                 # unit tests (Vitest)
npm run typecheck        # TypeScript strict check
npm run build            # production build into dist/
npm run generate-levels  # regenerate src/data/puzzles.json (deterministic seed)
npm run lint             # oxlint (typescript-eslint doesn't support TS 7 yet)
npm run format           # Prettier (format:check in CI)
npm run e2e              # Playwright smoke tests, mobile + desktop
npm run icons            # regenerate PNG app icons in public/icons
```

> Playwright: if the browser download fails, use an installed browser, e.g. `PW_CHANNEL=msedge npm run e2e` (PowerShell: `$env:PW_CHANNEL='msedge'`).

### Debug menu (dev only)

In `npm run dev` the title screen shows **🛠️ Debug (dev only)**:

- **Unlock all levels:** every level on the map is playable. Your real progress is kept, so turning it off restores it.
- **Play a mini-game:** launch any of the 10 bonus games at any tier with a random seed. Nothing is saved and you get no rewards.
- **Inventory:** +5 of every power-up, +1000 treats, +100 kibble.
- **Time travel:** jump the pup's clock forward 1h / 8h / 24h to test hunger, moods, yard production, expedition timers and the "missed you" greeting, or re-adopt from scratch.

The debug code is compiled out of `npm run build`, so players never see it. To test on a phone, run `npm run dev:mobile`, then open the `Network:` URL it prints (e.g. `http://192.168.x.x:5173`) on the phone. The phone must be on the same Wi-Fi; allow Node through the Windows firewall if asked.

## Play it online

**https://brent-broeckx.github.io/Woof/** - deployed automatically by `.github/workflows/deploy.yml` on every push to `main`. Works on desktop and mobile; use the browser's *Install app* / *Add to Home Screen* to install it as a PWA, which also works offline after the first visit.

The build injects a precache list and a build-specific cache version into `sw.js` (see `vite.config.ts`), so every deploy replaces the old offline cache.

## Code layout

| Path | Purpose |
|------|---------|
| `src/core/puzzle/` | Puzzle types, exact solver, human-style logic solver (hints/grading), generator, game reducer |
| `src/core/economy/` | Power-up definitions/effects, bonus reward rolls |
| `src/core/pet/` | Main pup (hunger decay, moods, bond, tricks, kibble rewards), yard treat production, the breed catalog, the pack, the Adoption Fair, and expeditions + postcards |
| `src/core/progression/` | Worlds, level table, bonus schedule, puzzle slot sizes/difficulty |
| `src/data/` | Pre-generated puzzle pack (`puzzles.json`) |
| `src/minigames/` | Bonus mini-games (pure `logic.ts` + React view each) and the registry |
| `src/store/` | Zustand stores: persisted save data and screen navigation |
| `src/ui/` | Board, dog SVGs, power-up tray, audio, confetti and all screens |
| `src/workers/` | Web Worker that generates Daily/Endless puzzles off the main thread |
| `public/` | PWA manifest, service worker, icons |
| `e2e/` | Playwright smoke tests |
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
| 10 | [docs/10-meta-roadmap.md](docs/10-meta-roadmap.md) | Next roadmap: main pup + kibble, yard idle, pack & Adoption Fair, expeditions, Arcade, achievements, weekly boss, new puzzles, cosmetics |

## One-paragraph pitch

Place one dog in every row, every column and every colored yard — and dogs don't like each other's personal space, so no two dogs may touch, not even diagonally. Every puzzle has exactly one solution reachable by pure logic. Every 5th level is a **Bonus Park**: a short, brainy mini-game (block puzzle, connect-the-dots, sliding tiles, …). Doing well there earns power-ups such as **Sniff** (reveal a dog), **Guide Dog** (places up to 3 new dogs) and **Fetch** (auto-cross a row) that make the main puzzles easier.

## Assumptions made while planning

- Name: **Woofdoku** (placeholder, easy to change).
- Single-player, offline-capable, **no ads / no real-money purchases** (it's a fan/personal project).
- Desktop + mobile browsers, touch-first, installable as a PWA.
- Stack: **Vite + TypeScript + React**, no heavy game engine; Canvas only where a mini-game benefits from it.
- Levels are **pre-generated** by our own generator/solver and shipped as JSON (with an optional "endless" mode generating on the fly later).
