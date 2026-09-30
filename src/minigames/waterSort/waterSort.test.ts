import { describe, expect, it } from 'vitest';
import {
  canPour,
  createWaterSortState,
  generateWaterSortPuzzle,
  isWaterSortSolved,
  pourAmount,
  pourBowls,
  resetWaterSort,
  selectOrPour,
  solveWaterSort,
  undoWaterSort,
  waterSortConfigForTier,
  waterSortStars,
  type WaterSortPuzzle,
} from './logic';

describe('Water Bowl Sort', () => {
  it('generates deterministic solvable puzzles for several tiers and seeds', () => {
    for (const tier of [1, 4, 8, 13, 18]) {
      for (const seed of [5, 77, 2026]) {
        const config = waterSortConfigForTier(tier);
        const a = generateWaterSortPuzzle(config, seed);
        const b = generateWaterSortPuzzle(config, seed);
        expect(a).toEqual(b);
        expect(a.colors).toBe(config.colors);
        expect(a.bowls).toHaveLength(config.colors + config.emptyBowls);
        const solution = solveWaterSort(a.bowls, a.capacity, 160_000);
        expect(solution, `tier ${tier} seed ${seed}`).not.toBeNull();
        expect(solution!.length).toBe(a.target);
      }
    }
  });

  it('moves only the top contiguous colour into a compatible bowl', () => {
    const bowls = [[0, 1, 1], [1], [], [2, 2, 2, 2]];
    expect(canPour(bowls, 0, 1)).toBe(true);
    expect(pourAmount(bowls, 0, 1)).toBe(2);
    expect(pourBowls(bowls, 0, 1)).toEqual([[0], [1, 1, 1], [], [2, 2, 2, 2]]);
    expect(canPour(bowls, 0, 3)).toBe(false);
  });

  it('selects, pours, undoes, and resets', () => {
    const puzzle: WaterSortPuzzle = { capacity: 4, colors: 2, target: 1, bowls: [[0, 0], [], [1, 1, 1, 1]] };
    let state = createWaterSortState(puzzle);
    state = selectOrPour(state, 0);
    expect(state.selected).toBe(0);
    state = selectOrPour(state, 1);
    expect(state.bowls).toEqual([[], [0, 0], [1, 1, 1, 1]]);
    expect(state.pours).toBe(1);
    state = undoWaterSort(state);
    expect(state.bowls).toEqual(puzzle.bowls);
    state = selectOrPour(selectOrPour(state, 0), 1);
    expect(resetWaterSort(state).pours).toBe(0);
  });

  it('detects solved states and scores pours against target', () => {
    expect(isWaterSortSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]])).toBe(true);
    expect(isWaterSortSolved([[0, 0], [], [1, 1, 1, 1]])).toBe(false);
    expect(waterSortStars(12, 10)).toBe(3);
    expect(waterSortStars(19, 10)).toBe(2);
    expect(waterSortStars(20, 10)).toBe(1);
  });
});
