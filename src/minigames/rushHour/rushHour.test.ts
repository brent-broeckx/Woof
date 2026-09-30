import { describe, expect, it } from 'vitest';
import {
  applyRushMove,
  createRushState,
  generateRushHourPuzzle,
  isRushSolved,
  moveRushVehicle,
  rushHourConfigForTier,
  rushHourStars,
  rushLegalMoves,
  rushStateKey,
  solveRush,
  undoRush,
} from './logic';

describe('Doggy Rush Hour', () => {
  it('generates deterministic solvable puzzles with reported optimal values', () => {
    for (const tier of [1, 4, 11, 18]) {
      for (const seed of [7, 99, 2026]) {
        const config = rushHourConfigForTier(tier);
        const a = generateRushHourPuzzle(config, seed);
        const b = generateRushHourPuzzle(config, seed);
        expect(rushStateKey(a.start)).toBe(rushStateKey(b.start));
        expect(a.vehicles).toEqual(b.vehicles);
        expect(solveRush(a)).toBe(a.optimal);
        expect(a.optimal).toBeGreaterThan(0);
      }
    }
  });

  it('keeps generation time reasonable for a small batch', () => {
    const started = Date.now();
    for (let i = 0; i < 12; i++) generateRushHourPuzzle(rushHourConfigForTier((i % 20) + 1), i * 17);
    expect(Date.now() - started).toBeLessThan(2500);
  });

  it('slides, blocks illegal moves, and supports undo', () => {
    const puzzle = generateRushHourPuzzle(rushHourConfigForTier(2), 1234);
    const legal = rushLegalMoves(puzzle, puzzle.start)[0];
    const state = createRushState(puzzle);
    const moved = applyRushMove(state, legal.vehicle, legal.to);
    expect(moved.moves).toBe(1);
    expect(moved.positions[legal.vehicle]).toBe(legal.to);
    expect(undoRush(moved).positions).toEqual(state.positions);
    expect(moveRushVehicle(puzzle, state.positions, legal.vehicle, -1)).toBeNull();
  });

  it('solves along the BFS shortest path for a generated puzzle', () => {
    const puzzle = generateRushHourPuzzle(rushHourConfigForTier(1), 42);
    let positions = [...puzzle.start];
    for (let depth = 0; depth < puzzle.optimal && !isRushSolved(puzzle, positions); depth++) {
      const next = rushLegalMoves(puzzle, positions)
        .map((move) => {
          const p = [...positions];
          p[move.vehicle] = move.to;
          return p;
        })
        .find((p) => solveRush({ vehicles: puzzle.vehicles, start: p }) === puzzle.optimal - depth - 1);
      expect(next).toBeTruthy();
      positions = next!;
    }
    expect(isRushSolved(puzzle, positions)).toBe(true);
  });

  it('scores stars against the optimal move count', () => {
    expect(rushHourStars(8, 7)).toBe(3);
    expect(rushHourStars(13, 7)).toBe(2);
    expect(rushHourStars(15, 7)).toBe(1);
  });
});
