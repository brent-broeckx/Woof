# 01 — Research: Meowdoku

## What it is
**Meowdoku** ("Meowdoku: Brain Puzzle Games" on Google Play, "Meowdoku!" on the App Store, also playable in browsers) is a cat-themed logic puzzle. It's a skin on a known puzzle family:

- **Star Battle (1-star)** / **LinkedIn "Queens"** / "Queens puzzle" — identical ruleset.
- Related to N-Queens (but with king-adjacency instead of queen diagonals) and to Sudoku-style region logic.

Knowing this is useful: there is a lot of existing knowledge on generating and grading these puzzles.

## Core rules (all apply simultaneously)
1. **One cat per colored region.** The board (N×N) is split into N irregular colored regions; each gets exactly one cat.
2. **One cat per row and per column.** Exactly one cat in each of the N rows and N columns.
3. **Cats cannot touch** — not orthogonally, not diagonally (the 8 surrounding cells are forbidden).

Result: an N×N board has exactly N cats. Each puzzle has a **unique solution** that can be reached **without guessing**.

## Controls
| Input | Action |
| --- | --- |
| Single tap | Toggle an **X** (a note: "no cat here") |
| Double tap | Place a **cat** (commit) |
| Drag | Paint / erase X's across many cells |

- A correct cat is **locked** (can't be removed) — it becomes an anchor.
- A wrong cat placement costs a life (**fish**). 3 fish per level; lose all → level failed.
- The game validates against the known unique solution (not just rule-consistency).

## Assistance
- **Hint** button: shows a forced move / highlights a mistake.
- X markers act as the player's scratchpad.
- Some versions auto-cross cells after a cat is placed (row/col/neighbors) — optional helper.

## Progression
- Starts at small boards (4×4 / 5×5) and grows (up to ~9×9 / 10×10+).
- Hundreds of hand-crafted (or generated + curated) levels.
- Difficulty rises via: larger boards, weird region shapes (snakes, rings, regions wrapping around others), longer deduction chains.
- Progress saved locally.

## Monetization (original)
- Free with ads; IAP for hints, extra lives, ad removal.
- **We will not copy this** — our "economy" is earned via bonus levels (see doc 04).

## Why it's fun (design pillars to preserve)
1. **Rules fit in one sentence**, depth emerges from interaction.
2. **No guessing** — every step has a "because". Satisfying "aha" moments.
3. **Cascades** — one placement unlocks the next deduction.
4. **Short sessions** — a level takes 30 s – 5 min.
5. **Cute, calm presentation** — soft colors, animal reactions, gentle sounds.
6. **Low-stakes failure** — 3 lives, instant retry.

## Common solving techniques (used later to grade difficulty)
| Technique | Description | Difficulty |
| --- | --- | --- |
| Single cell region | Region of size 1 → forced | Trivial |
| Last cell in row/col/region | Only one open cell left | Easy |
| Neighbor elimination | Cells around a placed dog are X | Easy |
| Region confined to a line | All of region A's open cells lie in row r → rest of row r is X | Medium |
| Line confined to a region | All open cells of row r lie in region A → rest of region A is X | Medium |
| Touch-all elimination | A cell that is adjacent to *every* open cell of a region → X | Medium |
| N-regions in N-lines (pigeonhole) | k regions confined to k rows → other cells of those rows are X | Hard |
| Contradiction (1-step lookahead) | Placing a dog here empties some region/line → X | Hard |

## What we copy vs. change
| Keep | Change |
| --- | --- |
| Exact 3-rule logic, unique solutions | Cats → **dogs** (breeds per region/color) |
| Tap X / double-tap place / drag | Add **bonus mini-game levels** every 5 levels |
| 3 lives per level | Lives called **bones** 🦴 |
| Hints | Hints become part of a **power-up** system earned in bonus levels |
| Growing board sizes | Chapter "worlds" (parks/neighborhoods) with themes |

## Sources
- https://meowdoku.co/how-to-play/
- https://meowdoku.wiki/how-to-play
- https://meowdoku.us/how-to-play
- https://meowdokugame.io/how-to-play/
- https://dlegames.org/blog/meowdoku-rules
