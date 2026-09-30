import { describe, expect, it } from 'vitest';
import {
  createKibbleState,
  generateKibblePuzzle,
  kibbleBlocksConfigForTier,
  kibbleBlocksStars,
  placeKibblePiece,
  rotatePiece,
  makeKibblePiece,
  scriptedKibbleSolution,
} from './logic';

describe('kibbleBlocks', () => {
  it('generates deterministic treat boards and deals', () => {
    const config = kibbleBlocksConfigForTier(8);
    expect(generateKibblePuzzle(config, 1234)).toEqual(generateKibblePuzzle(config, 1234));
    expect(generateKibblePuzzle(config, 1234)).not.toEqual(generateKibblePuzzle(config, 1235));
  });

  it('has a scripted solvable route for several tiers and seeds', () => {
    for (const tier of [1, 6, 12, 20]) {
      for (const seed of [10, 99, 2026]) {
        const puzzle = generateKibblePuzzle(kibbleBlocksConfigForTier(tier), seed);
        let state = createKibbleState(puzzle);
        for (const move of scriptedKibbleSolution(puzzle)) state = placeKibblePiece(state, move.handIndex, move.row, move.col);
        expect(state.won, `${tier}/${seed}`).toBe(true);
        expect(kibbleBlocksStars(state)).toBe(3);
      }
    }
  });

  it('places, rotates, clears rows, and collects treats', () => {
    const puzzle = generateKibblePuzzle(kibbleBlocksConfigForTier(1), 42);
    let state = createKibbleState(puzzle);
    const i5 = state.hand.findIndex((p) => p?.shapeId === 'i5');
    const i3 = state.hand.findIndex((p) => p?.shapeId === 'i3');
    const row = Math.floor(puzzle.treats.findIndex(Boolean) / 8);
    state = placeKibblePiece(state, i5, row, 0);
    expect(state.totalPlaced).toBe(1);
    expect(state.occupied.filter(Boolean).length).toBe(5);
    state = placeKibblePiece(state, i3, row, 5);
    expect(state.occupied.filter(Boolean).length).toBe(0);
    expect(state.collected.some(Boolean)).toBe(true);
    const vertical = rotatePiece(makeKibblePiece('i3', 'test'));
    expect(vertical.cells.some(([r]) => r > 0)).toBe(true);
  });

  it('scores partial progress with zero only before play', () => {
    const puzzle = generateKibblePuzzle(kibbleBlocksConfigForTier(1), 7);
    let state = createKibbleState(puzzle);
    expect(kibbleBlocksStars(state)).toBe(0);
    const idx = state.hand.findIndex(Boolean);
    state = placeKibblePiece(state, idx, 0, 0);
    expect(kibbleBlocksStars(state)).toBeGreaterThanOrEqual(1);
  });
});
