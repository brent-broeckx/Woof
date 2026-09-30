import { describe, expect, it } from 'vitest';
import {
  AUTHORED_PICTURES,
  applyNonogramCell,
  createNonogramPawsState,
  generateNonogramPawsPuzzle,
  isLineSatisfied,
  isLineSolvable,
  isNonogramComplete,
  nonogramPawsConfigForTier,
  nonogramPawsStars,
  pictureToPuzzle,
  setNonogramMode,
  solveByLineLogic,
} from './logic';

describe('Nonogram Paws', () => {
  it('keeps every authored picture line-solvable to completion', () => {
    expect(AUTHORED_PICTURES.length).toBeGreaterThanOrEqual(12);
    for (const picture of AUTHORED_PICTURES) {
      for (const mirrored of [false, true]) {
        const puzzle = pictureToPuzzle(picture, mirrored);
        const solved = solveByLineLogic(puzzle);
        expect(isLineSolvable(puzzle), picture.id).toBe(true);
        expect(solved?.filter((cell) => cell === 'unknown')).toHaveLength(0);
      }
    }
  });

  it('generates deterministic solvable puzzles for all sizes', () => {
    for (const tier of [1, 6, 10, 17]) {
      for (const seed of [3, 42, 2026]) {
        const config = nonogramPawsConfigForTier(tier);
        const a = generateNonogramPawsPuzzle(config, seed);
        const b = generateNonogramPawsPuzzle(config, seed);
        expect(a).toEqual(b);
        expect(a.size).toBe(config.size);
        expect(isLineSolvable(a)).toBe(true);
      }
    }
  });

  it('auto-corrects wrong fills, toggles marks, and completes on found filled cells', () => {
    const puzzle = pictureToPuzzle(AUTHORED_PICTURES[0]);
    let state = createNonogramPawsState(puzzle);
    const empty = puzzle.solution.findIndex((filled) => !filled);
    state = applyNonogramCell(state, empty, 'fill');
    expect(state.cells[empty]).toBe('mistake');
    expect(state.mistakes).toBe(1);

    const mark = puzzle.solution.findIndex((filled, index) => !filled && index !== empty);
    state = setNonogramMode(state, 'mark');
    state = applyNonogramCell(state, mark);
    expect(state.cells[mark]).toBe('empty');
    state = applyNonogramCell(state, mark);
    expect(state.cells[mark]).toBe('unknown');

    puzzle.solution.forEach((filled, index) => {
      if (filled) state = applyNonogramCell(state, index, 'fill');
    });
    expect(isNonogramComplete(state)).toBe(true);
    expect(isLineSatisfied(state, 'row', 1)).toBe(true);
  });

  it('scores stars by mistakes', () => {
    expect(nonogramPawsStars(0)).toBe(3);
    expect(nonogramPawsStars(2)).toBe(2);
    expect(nonogramPawsStars(3)).toBe(1);
  });
});
