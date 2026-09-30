import { describe, expect, it } from 'vitest';
import { BlockDropGame, HEIGHT, WIDTH, blockDropConfigForTier, pieceCells } from './blockDrop/logic';
import { allConnected, createLeashState, generateLeashPuzzle, hamiltonianPath, isFilled, leashStars, pointerDown, pointerEnter } from './connectLeashes/logic';
import { createRng } from '../core/rng';
import { isSolvedTiles, optimalMoves, scramble, slide, slidingStars } from './slidingPup/logic';

describe('Connect the Leashes', () => {
  it('builds a Hamiltonian path covering every cell', () => {
    const path = hamiltonianPath(6, createRng(3));
    expect(new Set(path).size).toBe(36);
    for (let i = 1; i < path.length; i++) {
      const [a, b] = [path[i - 1], path[i]];
      expect(Math.abs(Math.floor(a / 6) - Math.floor(b / 6)) + Math.abs((a % 6) - (b % 6))).toBe(1);
    }
  });

  it('generates distinct endpoints and can be solved by drawing', () => {
    const puzzle = generateLeashPuzzle(5, 5, 11);
    const cells = puzzle.endpoints.flat();
    expect(new Set(cells).size).toBe(10);
    // Solve by replaying the generator's Hamiltonian path in segments.
    const path = hamiltonianPath(5, createRng(11));
    let state = createLeashState(puzzle);
    let pos = 0;
    for (const [a, b] of puzzle.endpoints) {
      const start = path.indexOf(a);
      const end = path.indexOf(b);
      expect(start).toBe(pos);
      state = pointerDown(state, a);
      for (let i = start + 1; i <= end; i++) state = pointerEnter(state, path[i]);
      pos = end + 1;
    }
    expect(allConnected(state)).toBe(true);
    expect(isFilled(state)).toBe(true);
    expect(leashStars(state)).toBe(3);
  });

  it('cuts another leash when drawing through it', () => {
    const puzzle = {
      size: 3,
      endpoints: [
        [0, 2],
        [6, 8],
      ] as [number, number][],
    };
    let s = createLeashState(puzzle);
    s = pointerDown(s, 0);
    s = pointerEnter(s, 3);
    s = pointerEnter(s, 4);
    s = pointerDown(s, 6);
    s = pointerEnter(s, 7);
    s = pointerEnter(s, 4);
    expect(s.paths[0]).toEqual([0, 3]);
    expect(s.paths[1]).toEqual([6, 7, 4]);
  });
});

describe('Block Drop', () => {
  it('rotates pieces back to the start after 4 turns', () => {
    expect(pieceCells('T', 4)).toEqual(pieceCells('T', 0));
  });

  it('clears full lines', () => {
    const g = new BlockDropGame({ goalLines: 5, pieceLimit: 50, gravityMs: 500, garbageRows: 0 }, 1);
    for (let x = 0; x < WIDTH - 4; x++) g.board[(HEIGHT - 1) * WIDTH + x] = 'G';
    g.current = { type: 'I', rot: 0, x: 6, y: 0 };
    g.hardDrop();
    expect(g.lines).toBe(1);
    expect(g.board.slice((HEIGHT - 1) * WIDTH).every((c) => c === null)).toBe(true);
  });

  it('ends when the piece limit is used up', () => {
    const g = new BlockDropGame({ goalLines: 99, pieceLimit: 3, gravityMs: 500, garbageRows: 0 }, 2);
    for (let i = 0; i < 3; i++) g.hardDrop();
    expect(g.over).toBe(true);
    expect(g.toppedOut).toBe(false);
  });

  it('adds garbage rows for higher tiers', () => {
    const cfg = blockDropConfigForTier(6);
    const g = new BlockDropGame(cfg, 5);
    const bottom = g.board.slice((HEIGHT - 1) * WIDTH);
    expect(bottom.filter((c) => c === 'G').length).toBeGreaterThanOrEqual(WIDTH - 2);
  });
});

describe('Sliding Pup', () => {
  it('scrambles into a solvable, unsolved board and finds optimal length', () => {
    const { tiles } = scramble(3, 40, 7);
    expect(isSolvedTiles(tiles)).toBe(false);
    const opt = optimalMoves(tiles, 3);
    expect(opt).not.toBeNull();
    expect(opt!).toBeGreaterThan(0);
  });

  it('only slides tiles next to the gap', () => {
    const tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(slide(tiles, 3, 0)).toBeNull();
    expect(slide(tiles, 3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });

  it('rates stars by moves vs target', () => {
    expect(slidingStars(10, 10)).toBe(3);
    expect(slidingStars(25, 10)).toBe(2);
    expect(slidingStars(60, 10)).toBe(1);
  });
});
