import { describe, expect, it } from 'vitest';
import {
  createPipeState,
  generatePipeSprinklersPuzzle,
  isPipeSolved,
  pipeFlow,
  pipeSprinklersConfigForTier,
  pipeSprinklersStars,
  resetPipe,
  rotateMask,
  rotatePipeTile,
  undoPipe,
} from './logic';

describe('Pipe Sprinklers', () => {
  it('generates deterministic puzzles whose solution waters every tile without leaks', () => {
    for (const tier of [1, 6, 12, 20]) {
      for (const seed of [5, 44, 2026]) {
        const config = pipeSprinklersConfigForTier(tier);
        const a = generatePipeSprinklersPuzzle(config, seed);
        const b = generatePipeSprinklersPuzzle(config, seed);
        expect(a.start).toEqual(b.start);
        expect(a.solution).toEqual(b.solution);
        expect(isPipeSolved(a, a.solution)).toBe(true);
        expect(isPipeSolved(a, a.start)).toBe(false);
        expect(a.bowls.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('computes live water flow and leak status', () => {
    const puzzle = generatePipeSprinklersPuzzle(pipeSprinklersConfigForTier(3), 123);
    const solved = pipeFlow(puzzle.size, puzzle.source, puzzle.solution);
    expect(solved.watered.size).toBe(puzzle.size * puzzle.size);
    expect(solved.leaks.size).toBe(0);
    const start = pipeFlow(puzzle.size, puzzle.source, puzzle.start);
    expect(start.watered.size < puzzle.size * puzzle.size || start.leaks.size > 0).toBe(true);
  });

  it('rotates, undoes, and resets tiles', () => {
    const puzzle = generatePipeSprinklersPuzzle(pipeSprinklersConfigForTier(1), 9);
    const state = createPipeState(puzzle);
    const rotated = rotatePipeTile(state, 0);
    expect(rotated.moves).toBe(1);
    expect(rotated.masks[0]).toBe(rotateMask(state.masks[0], 1));
    expect(undoPipe(rotated).masks).toEqual(state.masks);
    expect(resetPipe(rotated).masks).toEqual(puzzle.start);
  });

  it('target is the sum of minimal rotations back to the generated solution', () => {
    const puzzle = generatePipeSprinklersPuzzle(pipeSprinklersConfigForTier(8), 66);
    expect(puzzle.target).toBeGreaterThan(0);
    let state = createPipeState(puzzle);
    puzzle.start.forEach((_, i) => {
      for (let turn = 0; turn < 4 && state.masks[i] !== puzzle.solution[i]; turn++) state = rotatePipeTile(state, i);
    });
    expect(isPipeSolved(puzzle, puzzle.solution)).toBe(true);
  });

  it('scores stars from the rotation target', () => {
    expect(pipeSprinklersStars(12, 10)).toBe(3);
    expect(pipeSprinklersStars(19, 10)).toBe(2);
    expect(pipeSprinklersStars(21, 10)).toBe(1);
  });
});
