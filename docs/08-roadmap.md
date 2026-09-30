# 08 — Roadmap

> **Progress:** Phases 0–3 are done (see checkboxes). Phase 4 is partly done: map, settings, kennel/shop, CSS animations. `[~]` = partially done.

Each phase ends with something playable. Estimates are rough focused dev-days.

| Phase | Name | Est. | Result |
|---|---|---|---|
| P0 | Project setup | 1 d | Empty app builds, tests, deploys |
| P1 | Core puzzle engine | 4 d | Generator + solvers + 80 graded levels |
| P2 | Playable main game | 4 d | Play puzzles on phone/desktop, progress saved |
| P3 | Bonus Parks + power-ups | 6 d | Full core loop incl. 3 mini-games |
| P4 | Art, audio, juice, UX | 5 d | Feels like a finished cozy game |
| P5 | More mini-games | 6 d | 2–5 extra bonus games |
| P6 | Release & extras | 3 d | PWA, daily puzzle, endless, balancing |

---

## Phase 0 — Project setup
- [x] Vite + React + TS strict, Vitest. *(ESLint, Prettier, Playwright still to add.)*
- [x] Folder structure from doc 06; path aliases.
- [x] Git repo init, CI (typecheck + test + build) via GitHub Actions.
- [ ] Deploy empty shell to static hosting.

**Done when:** `npm run dev / test / build` work; blank app deployed.

## Phase 1 — Core puzzle engine (pure TS)
- [x] Types, seeded RNG.
- [x] Rules validation + exact bitmask solver (solution counting).
- [x] Generator (dog placement → region growth → uniqueness repair).
- [x] Logic solver with techniques (doc 01) + difficulty grading.
- [x] `scripts/generate-levels.ts` → Worlds 1–4 JSON (80 puzzles) matching the curve.
- [x] Unit tests + "all shipped levels are unique & logic-solvable" test.

**Done when:** tests green; generator produces 100+ valid graded puzzles in < 30 s.

## Phase 2 — Playable main game
- [x] Puzzle reducer (X, dog, undo X, lives, win/lose).
- [x] Board component with tap / double-tap / long-press / drag / keyboard.
- [x] HUD (bones, level, timer), result & fail screens, stars.
- [x] Auto-cross + conflict highlight settings.
- [x] Free Nudge hint via logic solver.
- [x] Simple level-select list (map comes in P4); save/load in localStorage.
- [x] Tutorial for levels 1–3.

**Done when:** levels playable on phone & desktop, progress persists (placeholder art).

## Phase 3 — Bonus Parks + power-ups
- [x] `MiniGame` interface, registry, Bonus screen wrapper (intro, pause, result).
- [x] **Connect the Leashes** + level packs.
- [x] **Block Drop** (Canvas, goal-based short run, touch controls).
- [x] **Sliding Pup** (parity-safe shuffle, move targets).
- [x] Bonus schedule every 5th level; rotation; tier configs.
- [x] Inventory store; seeded reward rolls, pity timer, theme bias.
- [x] Power-ups: Sniff, Bone Shield, Extra Bone, Fetch, Flashlight, Paw Scan, Rewind, Guide Dog (+ max-3 rule, 3★ rule).
- [x] Power-up tray; "continue with Extra Bone" on fail screen.

**Done when:** full loop: 4 puzzles → bonus → power-ups → used in puzzles.

## Phase 4 — Art, audio, juice, UX
- [~] Dog breed SVGs (11 breeds), region palette, world background colours. *(Patterns still to do.)*
- [x] World map screen with path & nodes.
- [ ] Animations & sound (doc 07); haptics.
- [x] Settings screen incl. accessibility options.
- [~] Treats, Pet Shop, Kennel (inventory). *(Cosmetics still to do.)*
- [ ] Responsive pass (small phones → desktop).

## Phase 5 — More mini-games (pick subset)
Order: **Kibble Blocks → Nonogram Paws → Doggy Rush Hour → Memory Fetch → Pipe Sprinklers → Water Bowl Sort → Lights Out**.
- [ ] Each: pure logic + tests, tier configs, reward bias, intro demo, added to rotation.

## Phase 6 — Release & extras
- [ ] PWA (offline, installable, icons, splash).
- [ ] Performance & Lighthouse pass, bundle splitting.
- [ ] Playwright smoke tests in CI.
- [ ] Daily puzzle + streak; Endless mode (runtime generator in a Web Worker).
- [ ] Balancing pass using local stats.

---

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Generated puzzles feel samey / ugly regions | Mix region-growth strategies; score "shape interest"; hand-curate |
| Difficulty spikes | Logic-solver grading + playtests; power-ups as safety net |
| Double-tap unreliable on mobile | Long-press + placement-mode toggle |
| Tetris on touch feels bad | Big on-screen buttons, slow gravity, short goal-based runs |
| Scope creep with many mini-games | Hard MVP of 3; others only in Phase 5 |
| IP concerns | Original name & art; the ruleset itself is a generic genre (Star Battle / Queens) |

## Definition of done (v1.0)
- 100 levels (80 puzzles, 20 bonus) across 4 worlds.
- ≥ 3 mini-games (target 5), 8 power-ups, shop, kennel.
- Works offline on iOS Safari, Android Chrome, desktop Chrome/Firefox/Edge.
- All tests green; every shipped puzzle verified unique & logic-solvable.
