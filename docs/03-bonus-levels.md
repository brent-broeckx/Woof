# 03 — Bonus Levels ("Bonus Parks")

Every **5th level** (5, 10, 15, …) is a Bonus Park: a short (1–3 min), thinky mini-game. Performance (1–3 stars) determines the **power-up reward** (doc 04). Bonus levels **can't be failed in a way that blocks progress** — worst case you get a smaller reward and continue.

## Design rules for every mini-game
- Learnable in < 10 seconds (one-line rule + animated demo).
- Session length 60–180 s.
- Requires thinking, not reflexes (Block Drop is the one "semi-action" exception, and even there speed is gentle).
- Uses the same dog art & palette.
- Built on a shared `MiniGame` interface (doc 06) → consistent intro, HUD, result screen.
- Difficulty scales with how deep in the game you are (`bonusTier` = 1..N).
- Skippable after first play (gives minimum 1-star reward) so players who hate a genre aren't stuck.

## Rotation
Mini-games rotate so the same one never appears twice in a row. First appearances are fixed to teach them in order; afterwards a seeded pseudo-random rotation weighted toward less-recently-played games.

| Level | Bonus game |
|---|---|
| 5 | Connect the Leashes (intro) |
| 10 | Block Drop (intro) |
| 15 | Sliding Pup (intro) |
| 20 | Kibble Blocks (intro) |
| 25 | Memory Fetch (intro) |
| 30 | Nonogram Paws (intro) |
| 35 | Doggy Rush Hour (intro) |
| 40 | Water Bowl Sort (intro) |
| 45 | Kennel Lamps / Lights Out (intro) |
| 50 | Pipe Sprinklers (intro) |
| 55+ | seeded random rotation over all 10 games (never the same game twice in a row) |

**Implemented:** all 10 games (3 MVP + 7 Phase 5) live in `src/minigames/<id>/` with pure logic, unit tests, tier configs and a reward bias (`GAME_BIAS` in `rewards.ts`).

---

## MVP mini-games (Phase 3)

### 1. 🔗 Connect the Leashes (Flow Free-style)
- **Rules:** Grid with pairs of matching colored dogs & their leash-posts. Draw a leash connecting each pair. Leashes can't cross; for 3 stars the whole grid must be filled.
- **Grid:** 5×5 → 9×9 by tier.
- **Stars:** ⭐ all pairs connected · ⭐⭐ + board fully filled · ⭐⭐⭐ + within move target (no redraws beyond N).
- **Finish:** the game auto-completes the moment every pair is connected (no Done button).
- **Generation:** pre-generated packs (random space-filling path generator + optional uniqueness check).

### 2. 🧱 Block Drop (short Tetris)
- **Rules:** Classic falling tetrominoes on a 10×16 well but a **goal-based short run**: "Clear 8 lines" with a limited piece count (e.g. 40 pieces) OR a 2-minute timer. Shows next 3 pieces + hold. Slow gravity; hard drop optional.
- **Twist (thinking):** some tiers start with pre-filled "garden" rows with gaps and a **bone** embedded; clear the row containing the bone to collect it. *(MVP: garden rows are implemented; embedded bones are deferred. Stars are by lines vs goal: goal = 3★, ≥60% = 2★, ≥30% = 1★.)*
- **Stars:** based on lines cleared / bones collected vs goal.
- **Controls:** arrows/WASD, swipe left/right/down, tap to rotate; on-screen buttons for mobile.

### 3. 🧩 Sliding Pup (15-puzzle)
- **Rules:** Slide tiles to reassemble a dog picture. 3×3 → 4×4 by tier.
- **Stars:** by move count vs target (solver computes optimal for 3×3 via BFS/IDA*, heuristic target for 4×4).
- Always generate solvable permutations (parity check).

---

## Phase 5 extra mini-games (pick & choose)

### 4. 🟦 Kibble Blocks (Block Blast / 1010!-style)
- 8×8 grid, you get 3 polyomino pieces at a time, place them anywhere; full rows/columns clear. No gravity, no timer — pure planning.
- Goal: reach score X in limited rounds, or clear specific marked cells ("treats").
- Input: drag a piece onto the board (on touch it floats above your finger so it stays visible), or tap a piece then tap a cell. Board cells are always square.

### 5. 🃏 Memory Fetch (pairs)
- Flip cards to find pairs of dog breeds. 4×3 → 6×5. Stars by number of flips. Later tiers add "shuffle after N misses". Every pair has a visually unique face (each breed once; larger boards add hats to repeats) so no two pairs look alike.

### 6. 🔢 Nonogram Paws (mini Picross)
- 5×5 / 8×8 nonograms that reveal a dog pixel-art picture. Fits the logic-puzzle vibe very well.

### 7. 🚗 Doggy Rush Hour (Unblock Me)
- Slide cars/crates on a 6×6 lot to get the dog van out. Pre-generated levels with known optimal solutions; stars by moves vs optimal. Vehicles follow your finger live and can slide several cells in one drag (counted as one move); the dog drives out through the visible EXIT when freed.

### 8. 🚿 Pipe Sprinklers (pipe rotation puzzle)
- Rotate pipe tiles so water from the tap reaches every thirsty dog's bowl. Pipes turn blue as soon as water reaches them; no leak markers. You win once every dog is watered. Stars by rotations used.

### 9. 💧 Water Bowl Sort (Water Sort puzzle)
- Pour colored water between bowls until each bowl is a single color.

### 10. 💡 Lights Out: Kennel Lamps
- Toggling a kennel light flips it and its neighbors; turn all off.

### 11. 🧠 Simon Barks (sequence memory)
- Repeat growing sequences of dog barks/colors. Very short; good as a "break" game.

## Comparison / prioritization
| Game | Fun | "Thinky" | Build effort | Mobile-friendly | Priority |
|---|---|---|---|---|---|
| Connect the Leashes | ★★★ | ★★★ | M | ★★★ | **MVP** |
| Block Drop (Tetris) | ★★★ | ★★ | M | ★★ | **MVP** (explicitly requested) |
| Sliding Pup | ★★ | ★★★ | S | ★★★ | **MVP** |
| Kibble Blocks | ★★★ | ★★★ | S–M | ★★★ | P5 high |
| Nonogram Paws | ★★★ | ★★★ | M | ★★ | P5 high |
| Memory Fetch | ★★ | ★★ | S | ★★★ | P5 medium |
| Doggy Rush Hour | ★★★ | ★★★ | M (levels) | ★★★ | P5 medium |
| Pipe Sprinklers | ★★ | ★★ | M | ★★★ | P5 low |
| Water Bowl Sort | ★★ | ★★ | S | ★★★ | P5 low |
| Lights Out | ★ | ★★★ | S | ★★★ | P5 low |
| Simon Barks | ★ | ★ | S | ★★★ | optional |

## Shared bonus result screen
- Stars earned (animated), power-ups rolled from the reward table (doc 04), "Continue" → next main level.
- "Replay for better reward" allowed once; the **best** result counts (no reward stacking).
