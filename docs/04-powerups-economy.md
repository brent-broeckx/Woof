# 04 — Power-ups & Economy

## Goals
- Power-ups make the main puzzle **easier but never trivial**.
- Main source = **Bonus Parks** (core idea). Secondary source = treats earned from stars.
- No real money, no ads, no energy timers.

## Currencies
| Currency | Earned | Spent on |
|---|---|---|
| **Power-ups** (items) | Bonus Parks, world completion chests | Used in main levels |
| **Treats** 🍖 (soft currency) | Every main-level win (1★=5, 2★=10, 3★=20), first-time 3★ bonus | "Pet Shop": buy specific power-ups (expensive, so bonus levels remain the main source) and cosmetics (board themes, dog outfits) |

## Power-ups (main puzzle)
| Icon | Name | Effect | Rarity |
|---|---|---|---|
| 👃 | **Sniff** | Reveals & places one correct dog (player taps a yard to sniff there) | Rare |
| 🦴 | **Extra Bone** | +1 life (max 5). Also offered on the fail screen to continue | Common |
| 🎾 | **Fetch** | Tap a row: crosses every wrong empty tile in that row except one decoy (as implemented) | Common |
| 🔦 | **Flashlight** | Highlights one cell that is logically forced next + shows the explanation | Uncommon |
| 🦮 | **Guide Dog** | Places up to 3 *new* correct dogs (never re-counts dogs you already placed; may finish the level) | Epic |

Removed (they felt useless): Bone Shield, Paw Scan, Rewind. Old saves silently drop them from the inventory.

In-level limits: **max 3 power-ups per level** (prevents trivializing); 3★ requires none.

**Starter inventory (implemented):** a new save begins with 1× Extra Bone and 1× Fetch so the first levels can show off power-ups before the first Bonus Park.

**Implementation note:** the tray shows all 5 power-ups in a single row of equal buttons on every screen size (with counts); the "pinned loadout" below is deferred.

### Loadout
- Power-up tray shows up to 4 pinned types (default: most owned/last used). Keeps HUD clean; full inventory via "more" button.

## Bonus Park reward tables
| Stars | Rolls | Guaranteed | Pool weights (Common / Uncommon / Rare / Epic) |
|---|---|---|---|
| ⭐ | 1 | — | 80 / 20 / 0 / 0 |
| ⭐⭐ | 2 | 1× Common | 60 / 30 / 10 / 0 |
| ⭐⭐⭐ | 3 | 1× Uncommon | 45 / 35 / 17 / 3 |

- **Theme bias** per mini-game: Block Drop favors Extra Bone, Connect the Leashes favors Fetch, Sliding Pup favors Flashlight/Sniff. Gives a reason to care which game appears.
- **Pity timer:** guaranteed Rare every 4 bonus levels without one.
- Rolls are **seeded** per (save, level) so replaying/refreshing can't reroll.

## Other sources
- **World chest** after each world (every 25 levels): 3–5 power-ups + treats, better with more stars.
- **Daily puzzle** (later): 1 random power-up.

## Pet Shop prices (starting values, tune in playtest)
| Item | Price 🍖 |
|---|---|
| Extra Bone / Fetch | 60 |
| Flashlight | 120 |
| Sniff | 200 |
| Guide Dog | 400 |
| Board theme / dog outfit | 150–500 |

## Balancing targets
- Average player ends each 5-level cycle with roughly **+1 net power-up** (earn ~3, use ~2).
- Hard levels must be solvable without power-ups; power-ups are comfort, not gates.
- Track (locally, dev-only) usage stats per level to spot spikes.

## Data model (sketch)
```ts
type PowerUpId = 'sniff'|'extraBone'|'fetch'|'flashlight'|'guideDog';
interface Inventory { powerUps: Record<PowerUpId, number>; treats: number; cosmetics: string[] }
```
