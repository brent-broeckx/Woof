import { describe, expect, it } from 'vitest';
import {
  createLightsOutState,
  generateLightsOutPuzzle,
  lightsOutConfigForTier,
  lightsOutStars,
  pressLamp,
  pressLampOnBoard,
  resetLamps,
  solveLightsOut,
  undoLamp,
} from './logic';

describe('lightsOut', () => {
  it('generates deterministic solvable puzzles and minimal solutions', () => {
    for (const tier of [1, 7, 14, 20, 25]) {
      for (const seed of [1, 22, 333]) {
        const puzzle = generateLightsOutPuzzle(lightsOutConfigForTier(tier), seed);
        expect(puzzle).toEqual(generateLightsOutPuzzle(lightsOutConfigForTier(tier), seed));
        let lamps = [...puzzle.initial];
        const solution = solveLightsOut(puzzle.size, lamps);
        solution.forEach((on, cell) => {
          if (on) lamps = pressLamp({ puzzle, lamps, moves: 0, history: [], won: false }, cell).lamps;
        });
        expect(lamps.some(Boolean)).toBe(false);
        expect(solution.filter(Boolean).length).toBe(puzzle.optimal);
      }
    }
  });

  it('toggles orthogonal neighbours, undo, and reset', () => {
    const puzzle = {
      size: 3,
      initial: new Array(9).fill(false) as boolean[],
      optimal: 1,
      solution: [true, false, false, false, false, false, false, false, false],
      seed: 1,
    };
    expect([1, 3, 4, 5, 7].every((i) => pressLampOnBoard(puzzle.initial, 3, 4)[i])).toBe(true);
    let state = { ...createLightsOutState(puzzle), won: false };
    state = pressLamp(state, 4);
    state = undoLamp(state);
    expect(state.lamps.some(Boolean)).toBe(false);
    state = pressLamp(state, 0);
    expect(resetLamps(state).lamps.some(Boolean)).toBe(false);
  });

  it('scores by moves versus optimal', () => {
    const puzzle = generateLightsOutPuzzle(lightsOutConfigForTier(1), 8);
    let state = createLightsOutState(puzzle);
    puzzle.solution.forEach((on, cell) => {
      if (on) state = pressLamp(state, cell);
    });
    expect(state.won).toBe(true);
    expect(lightsOutStars(state)).toBe(3);
    expect(lightsOutStars({ ...state, moves: puzzle.optimal * 2 + 2 })).toBe(2);
    expect(lightsOutStars({ ...state, moves: puzzle.optimal * 3 + 8 })).toBe(1);
  });
});
