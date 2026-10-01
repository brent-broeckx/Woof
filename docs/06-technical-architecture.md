# 06 — Technical Architecture

## Stack
| Concern | Choice | Why |
|---|---|---|
| Build | **Vite** | fast dev, simple static output |
| Language | **TypeScript** (strict) | puzzle logic benefits from types |
| UI | **React** | screens, HUD, menus, grid (DOM grid is fine up to 11×11) |
| State | **Zustand** | small global stores (save, inventory, settings) |
| Mini-game rendering | DOM/CSS for grid games; **Canvas 2D** for Block Drop | no need for Phaser/Pixi |
| Animation | CSS transitions + **Motion** (Framer Motion) | juicy UI cheaply |
| Audio | **Howler.js** | simple cross-browser audio sprites |
| Persistence | `localStorage` (versioned JSON save) | offline, no backend |
| PWA | `vite-plugin-pwa` | installable, offline |
| Tests | **Vitest** (logic) + **Playwright** (smoke E2E) | |
| Lint/format | ESLint + Prettier | |
| Hosting | GitHub Pages / Netlify / Vercel (static) | |

No backend needed for v1.

## Folder structure (planned)
```
meowgames/
  README.md, docs/                 ← this plan
  package.json, vite.config.ts, tsconfig.json
  public/                          ← icons, manifest, audio
  scripts/
    generate-levels.ts             ← offline generator → src/data/levels/*.json
    grade-levels.ts                ← re-grade / report difficulty
  src/
    main.tsx, App.tsx
    core/                          ← pure TS, no React (fully unit-tested)
      puzzle/
        types.ts                   ← Board, Region, Cell, Solution
        rules.ts                   ← validation helpers
        solver.ts                  ← exact backtracking solver (count solutions)
        logicSolver.ts             ← human-technique solver (hints + grading)
        generator.ts               ← board + region generator with uniqueness
        reducer.ts                 ← PuzzleState + actions
      economy/
        powerups.ts                ← effects operating on puzzle state
        rewards.ts                 ← reward tables, seeded rolls, pity
      progression/
        levels.ts                  ← level index, bonus schedule, tier mapping
      save/
        saveStore.ts               ← versioned save + migrations
      rng.ts                       ← seeded PRNG (mulberry32)
    minigames/
      MiniGame.ts                  ← shared interface + registry
      connectLeashes/ blockDrop/ slidingPup/   (later: kibbleBlocks/ memory/ nonogram/ ...)
        logic.ts                   ← pure rules (tested)
        View.tsx                   ← rendering/input
        tiers.ts                   ← tier → config
    ui/
      screens/    (Title, WorldMap, PuzzleLevel, BonusLevel, Result, Kennel, Shop, Settings)
      components/ (Board, Cell, PowerUpTray, BoneCounter, Modal, Button...)
      hooks/      (useGestures, useKeyboardGrid)
    assets/       (svg dogs, textures)
    data/levels/  world1.json ...
  tests/e2e/
```

## Core puzzle model
```ts
interface Puzzle { size: number; regions: number[]; solution: number[] } // regions: len N*N, solution: col per row
type CellMark = 'empty' | 'x' | 'autoX' | 'dog';
interface PuzzleState {
  puzzle: Puzzle; marks: CellMark[]; bones: number;
  mistakes: number; powerUpsUsed: number; history: Action[]; status: 'playing'|'won'|'lost';
}
```
Game state updates via a pure reducer `applyAction(state, action) → state` → trivially testable; undo = history.

## Level generator (offline script, reusable at runtime for endless mode)
1. **Place dogs:** random permutation `p` of 0..N-1 with `|p[r] - p[r+1]| > 1` (no touching), seeded backtracking.
2. **Grow regions:** each dog seeds a region; randomized flood-fill (weighted for varied shapes — compact, snaky, wrapping) until all cells are assigned.
3. **Uniqueness check:** exact bitmask solver (rows in order, prune by used columns/regions/adjacency) counts solutions up to 2.
4. **If not unique:** take a differing alternate solution, reassign border cells so the alternate violates a region; repeat (cap iterations, else restart).
5. **Grade:** run the **logic solver** (techniques in increasing difficulty). If it can't finish without guessing → reject (guarantees "no guessing"). Record max technique + step counts → difficulty score.
6. **Select** puzzles into level slots matching the curve in doc 05; dedupe (incl. rotations/mirrors); write JSON.

Performance: N ≤ 11 bitmask solving is sub-millisecond per board; generating hundreds of levels takes seconds.

## Logic solver (hints + grading + power-ups)
- Candidate model: bitset of still-possible cells.
- Techniques as ordered plug-ins: `{ id, difficulty, apply(state) → Deduction | null }`.
- `Deduction = { kind: 'place' | 'eliminate', cells, reason, highlight }` → reused by **Nudge**, **Flashlight**, **Fetch**, **Guide Dog**.

## MiniGame interface
```ts
interface MiniGameResult { stars: 0 | 1 | 2 | 3; score: number }
interface MiniGameProps { tier: number; seed: number; onFinish(result: MiniGameResult): void }
interface MiniGameDefinition {
  id: string; name: string; rules: string;
  component: React.LazyExoticComponent<React.FC<MiniGameProps>>;
  rewardBias: Partial<Record<PowerUpId, number>>;
}
```
Registry → `BonusLevel` screen wraps any mini-game with intro card, pause, and result screen.

## Save data
```ts
interface SaveV1 {
  version: 1;
  levels: Record<number, { stars: number; bestTimeMs?: number; bonusRewardClaimed?: boolean }>;
  inProgress?: { levelId: number; state: PuzzleState };
  inventory: Inventory; settings: Settings; stats: Stats; pityCounter: number;
}
```
- Autosave after each action (debounced); refresh resumes the current level.
- Export/import save as JSON string (manual backup).

## Input handling
- Unified pointer events with custom double-tap detection (≤ 300 ms, same cell), long-press (≥ 400 ms), drag-painting.
- `touch-action: none` on board; prevent double-tap zoom.
- Keyboard navigation with roving focus for accessibility.

## Testing strategy
- **Unit (Vitest):** rules, solver uniqueness, generator invariants, reducer, power-up effects, deterministic reward rolls, save migrations, each mini-game's pure logic (line clears, rotations, sliding parity, path validation).
- **Level CI check:** loads all shipped JSON levels and verifies uniqueness + logic-solvability.
- **E2E (Playwright):** start → solve level 1 using known solution → return to map; bonus via test hook.

## Budgets
- Initial JS < 250 KB gzipped; mini-games lazy-loaded.
- 60 fps animations on mid-range phones.
- Lighthouse PWA + accessibility ≥ 90.
