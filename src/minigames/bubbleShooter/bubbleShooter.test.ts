import { describe, expect, it } from 'vitest';
import {
  COLS,
  LAUNCH_X,
  MAX_ROWS,
  aimAt,
  bubbleConfigForTier,
  bubbleStars,
  cellCenter,
  colorsOnBoard,
  countBubbles,
  createBubbleState,
  fireShot,
  floatingCells,
  neighbors,
  rowWidth,
  swapBubbles,
  traceShot,
  type BubbleState,
  type Grid,
} from './logic';

const empty = (rows: number): Grid => Array.from({ length: rows }, (_, r) => Array.from({ length: rowWidth(r) }, () => null));

function custom(grid: Grid, current: number, next = current, extra: Partial<BubbleState> = {}): BubbleState {
  const config = { colors: 4, rows: grid.length, shotFactor: 1, missesPerDrop: 3 };
  return {
    config,
    seed: 1,
    grid,
    ceiling: 0,
    current,
    next,
    shotsLeft: 20,
    shotLimit: 20,
    misses: 0,
    initialCount: countBubbles(grid),
    draws: 2,
    cleared: false,
    overflow: false,
    over: false,
    ...extra,
  };
}

describe('Bubble Bark', () => {
  it('generates deterministic boards that use every colour', () => {
    for (const tier of [1, 5, 10, 20]) {
      const config = bubbleConfigForTier(tier);
      const a = createBubbleState(config, 42);
      expect(a).toEqual(createBubbleState(config, 42));
      expect(a.grid.length).toBe(config.rows);
      expect(colorsOnBoard(a.grid)).toEqual(Array.from({ length: config.colors }, (_, i) => i));
      expect(colorsOnBoard(a.grid)).toContain(a.current);
      expect(colorsOnBoard(a.grid)).toContain(a.next);
      expect(a.shotLimit).toBeGreaterThan(0);
    }
  });

  it('scales difficulty with tier', () => {
    const easy = bubbleConfigForTier(1);
    const hard = bubbleConfigForTier(20);
    expect(hard.colors).toBeGreaterThan(easy.colors);
    expect(hard.rows).toBeGreaterThan(easy.rows);
    expect(hard.missesPerDrop).toBeLessThan(easy.missesPerDrop);
    expect(hard.shotFactor).toBeLessThan(easy.shotFactor);
  });

  it('computes hex neighbours for offset rows', () => {
    expect(neighbors(0, 0)).toEqual([
      [0, 1],
      [1, 0],
    ]);
    expect(neighbors(1, 3)).toEqual([
      [1, 2],
      [1, 4],
      [0, 3],
      [0, 4],
      [2, 3],
      [2, 4],
    ]);
    for (const [r, c] of neighbors(2, 4)) {
      const [x1, y1] = cellCenter({ ceiling: 0 }, 2, 4);
      const [x2, y2] = cellCenter({ ceiling: 0 }, r, c);
      expect(Math.hypot(x1 - x2, y1 - y2)).toBeCloseTo(1, 5);
    }
  });

  it('shoots straight up into the ceiling on an empty column', () => {
    const state = custom(empty(1), 0);
    state.grid[0][0] = 1;
    const { cell, path } = traceShot(state, 0);
    expect(cell[0]).toBe(0);
    expect(Math.abs(cellCenter(state, cell[0], cell[1])[0] - LAUNCH_X)).toBeLessThanOrEqual(0.5);
    expect(path.length).toBeGreaterThanOrEqual(2);
  });

  it('bounces off the side walls', () => {
    const state = custom(empty(1), 0);
    state.grid[0][7] = 1;
    const { path, cell } = traceShot(state, aimAt(0, 6));
    expect(path.some(([x]) => x === 0.5)).toBe(true);
    expect(cell[0]).toBe(0);
    expect(cellCenter(state, cell[0], cell[1])[0]).toBeGreaterThan(0.5);
  });

  it('pops groups of three or more and drops floating bubbles', () => {
    const grid = empty(3);
    grid[0][4] = 0;
    grid[0][5] = 0;
    grid[1][4] = 2; // hangs from 0,4 / 0,5 only
    grid[2][4] = 2;
    const state = custom(grid, 0, 1);
    const result = fireShot(state, aimAt(cellCenter(state, 0, 3)[0], 0.5));
    expect(result).not.toBeNull();
    expect(result!.placed).toEqual([0, 3]);
    expect(result!.popped).toHaveLength(3);
    expect(result!.dropped).toHaveLength(2);
    expect(result!.state.cleared).toBe(true);
    expect(result!.state.over).toBe(true);
    expect(bubbleStars(result!.state)).toBe(3);
  });

  it('does not pop a pair', () => {
    const grid = empty(1);
    grid[0][0] = 0;
    const state = custom(grid, 0, 0);
    const result = fireShot(state, aimAt(cellCenter(state, 0, 1)[0], 0.5))!;
    expect(result.popped).toHaveLength(0);
    expect(countBubbles(result.state.grid)).toBe(2);
    expect(result.state.misses).toBe(1);
  });

  it('finds floating bubbles', () => {
    const grid = empty(3);
    grid[0][0] = 1;
    grid[1][0] = 1;
    grid[2][5] = 2;
    expect(floatingCells(grid)).toEqual([[2, 5]]);
  });

  it('drops the ceiling after the miss streak', () => {
    const grid = empty(1);
    grid[0][0] = 0;
    grid[0][7] = 1;
    let state = custom(grid, 2, 2);
    for (let i = 0; i < 3; i++) {
      // A new colour each shot so nothing can pop.
      const r = fireShot({ ...state, current: 3 + i }, (i - 1) * 0.6)!;
      state = r.state;
      if (i < 2) expect(r.ceilingDropped).toBe(false);
      else expect(r.ceilingDropped).toBe(true);
    }
    expect(state.ceiling).toBe(1);
    expect(state.misses).toBe(0);
    expect(cellCenter(state, 0, 0)[1]).toBeGreaterThan(cellCenter({ ceiling: 0 }, 0, 0)[1]);
  });

  it('ends the round when bubbles cross the bottom line', () => {
    const grid = empty(MAX_ROWS);
    for (let r = 0; r < MAX_ROWS; r++) grid[r][0] = r % 2;
    const state = custom(grid, 2, 2, { config: { colors: 3, rows: MAX_ROWS, shotFactor: 1, missesPerDrop: 1 } });
    const result = fireShot(state, aimAt(COLS - 0.5, 0.5))!;
    expect(result.state.overflow).toBe(true);
    expect(result.state.over).toBe(true);
  });

  it('only deals colours that remain on the board', () => {
    const grid = empty(2);
    grid[0][0] = 0;
    grid[0][1] = 0;
    grid[0][5] = 3;
    const state = custom(grid, 0, 0);
    const result = fireShot(state, aimAt(cellCenter(state, 0, 2)[0], 0.5))!;
    expect(result.popped).toHaveLength(3);
    expect(result.state.current).toBe(3);
    expect(result.state.next).toBe(3);
  });

  it('ends when shots run out and rates stars by cleared share', () => {
    const grid = empty(1);
    for (let c = 0; c < 8; c++) grid[0][c] = c % 2;
    const state = custom(grid, 2, 2, { shotsLeft: 1, initialCount: 8 });
    const result = fireShot(state, 0)!;
    expect(result.state.over).toBe(true);
    expect(bubbleStars(result.state)).toBe(1);
    expect(bubbleStars({ ...result.state, grid: [[0, 1, null, null, null, null, null, null]] })).toBe(2);
  });

  it('swaps current and next bubbles', () => {
    const state = custom(empty(1), 0, 1);
    expect(swapBubbles(state)).toMatchObject({ current: 1, next: 0 });
  });
});
