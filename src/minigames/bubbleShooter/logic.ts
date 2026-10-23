import { createRng, hashSeed } from '../../core/rng';

/**
 * Bubble Bark — a classic bubble shooter on an offset hex grid.
 * Units are bubble diameters. Even rows hold COLS bubbles, odd rows COLS - 1 (shifted half a bubble).
 */
export const COLS = 8;
/** Bubbles whose row reaches this line (ceiling drops included) end the round. */
export const MAX_ROWS = 12;
export const ROW_H = Math.sqrt(3) / 2;
export const FIELD_W = COLS;
export const LAUNCH_X = COLS / 2;
export const LAUNCH_Y = 0.5 + MAX_ROWS * ROW_H + 1.1;
export const FIELD_H = LAUNCH_Y + 0.9;
/** Shots can't go flatter than this (radians from straight up). */
export const MAX_AIM = (80 * Math.PI) / 180;
/** Distance between centres at which a flying bubble sticks (slightly forgiving). */
const HIT_DIST = 0.86;
const STEP = 0.05;

export type Cell = readonly [row: number, col: number];
export type Grid = (number | null)[][];

export interface BubbleConfig {
  colors: number;
  rows: number;
  /** Shots granted per starting bubble. */
  shotFactor: number;
  /** Shots in a row without a pop before the ceiling drops. */
  missesPerDrop: number;
}

export interface BubbleState {
  config: BubbleConfig;
  seed: number;
  grid: Grid;
  /** Rows the ceiling has dropped. */
  ceiling: number;
  current: number;
  next: number;
  shotsLeft: number;
  shotLimit: number;
  misses: number;
  initialCount: number;
  draws: number;
  cleared: boolean;
  /** Bubbles crossed the bottom line. */
  overflow: boolean;
  over: boolean;
}

export interface ShotResult {
  state: BubbleState;
  path: [number, number][];
  placed: Cell;
  popped: Cell[];
  dropped: Cell[];
  /** The ceiling dropped after this shot. */
  ceilingDropped: boolean;
  color: number;
}

export function bubbleConfigForTier(tier: number): BubbleConfig {
  const t = Math.max(1, Math.floor(tier));
  return {
    colors: Math.min(6, 3 + Math.floor((t - 1) / 4)),
    rows: Math.min(8, 4 + Math.floor((t - 1) / 3)),
    shotFactor: Math.max(0.32, 0.6 - (t - 1) * 0.016),
    missesPerDrop: Math.max(3, 6 - Math.floor((t - 1) / 5)),
  };
}

export const rowWidth = (row: number) => (row % 2 === 0 ? COLS : COLS - 1);

export function cellCenter(state: Pick<BubbleState, 'ceiling'>, row: number, col: number): [number, number] {
  return [col + (row % 2 === 0 ? 0.5 : 1), 0.5 + (row + state.ceiling) * ROW_H];
}

export function neighbors(row: number, col: number): Cell[] {
  const out: Cell[] = [];
  const add = (r: number, c: number) => {
    if (r >= 0 && c >= 0 && c < rowWidth(r)) out.push([r, c]);
  };
  add(row, col - 1);
  add(row, col + 1);
  const [a, b] = row % 2 === 0 ? [col - 1, col] : [col, col + 1];
  add(row - 1, a);
  add(row - 1, b);
  add(row + 1, a);
  add(row + 1, b);
  return out;
}

export const getCell = (grid: Grid, row: number, col: number) => grid[row]?.[col] ?? null;

function cloneGrid(grid: Grid): Grid {
  return grid.map((r) => r.slice());
}

function setCell(grid: Grid, row: number, col: number, value: number | null) {
  while (grid.length <= row) grid.push(Array.from({ length: rowWidth(grid.length) }, () => null));
  grid[row][col] = value;
}

function trimGrid(grid: Grid) {
  while (grid.length && grid[grid.length - 1].every((c) => c === null)) grid.pop();
}

export function countBubbles(grid: Grid): number {
  let n = 0;
  for (const row of grid) for (const c of row) if (c !== null) n++;
  return n;
}

export function colorsOnBoard(grid: Grid): number[] {
  const set = new Set<number>();
  for (const row of grid) for (const c of row) if (c !== null) set.add(c);
  return [...set].sort((a, b) => a - b);
}

function drawColor(seed: number, draws: number, grid: Grid, fallback: number): number {
  const colors = colorsOnBoard(grid);
  if (!colors.length) return fallback;
  return createRng(hashSeed(seed, 'bubble-draw', draws)).pick(colors);
}

export function generateBubbleGrid(config: BubbleConfig, seed: number): Grid {
  const rng = createRng(hashSeed(seed, 'bubble-grid'));
  const grid: Grid = [];
  for (let r = 0; r < config.rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < rowWidth(r); c++) {
      // Copy a neighbour's colour often so the board has satisfying clumps.
      const prev: number[] = [];
      if (c > 0) prev.push(row[c - 1]!);
      for (const [nr, nc] of neighbors(r, c)) if (nr === r - 1) prev.push(grid[nr][nc]!);
      row.push(prev.length && rng.next() < 0.5 ? rng.pick(prev) : rng.int(config.colors));
    }
    grid.push(row);
  }
  // Every colour should appear at least once.
  for (let color = 0; color < config.colors; color++) {
    if (colorsOnBoard(grid).includes(color)) continue;
    const r = rng.int(config.rows);
    grid[r][rng.int(rowWidth(r))] = color;
  }
  return grid;
}

export function createBubbleState(config: BubbleConfig, seed: number): BubbleState {
  const grid = generateBubbleGrid(config, seed);
  const initialCount = countBubbles(grid);
  const shotLimit = Math.ceil(initialCount * config.shotFactor);
  return {
    config,
    seed,
    grid,
    ceiling: 0,
    current: drawColor(seed, 0, grid, 0),
    next: drawColor(seed, 1, grid, 0),
    shotsLeft: shotLimit,
    shotLimit,
    misses: 0,
    initialCount,
    draws: 2,
    cleared: false,
    overflow: false,
    over: false,
  };
}

export const clampAim = (angle: number) => Math.max(-MAX_AIM, Math.min(MAX_AIM, angle));

/** Angle (from straight up, positive = right) pointing at a field position. */
export function aimAt(x: number, y: number): number {
  const dx = x - LAUNCH_X;
  const dy = LAUNCH_Y - y;
  if (dy <= 0.05) return clampAim(dx < 0 ? -MAX_AIM : MAX_AIM);
  return clampAim(Math.atan2(dx, dy));
}

function attachable(state: BubbleState, row: number, col: number): boolean {
  if (getCell(state.grid, row, col) !== null) return false;
  if (row === 0) return true;
  return neighbors(row, col).some(([r, c]) => getCell(state.grid, r, c) !== null);
}

function snapCell(state: BubbleState, x: number, y: number): Cell {
  let best: Cell = [0, 0];
  let bestDist = Infinity;
  const maxRow = state.grid.length;
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c < rowWidth(r); c++) {
      if (!attachable(state, r, c)) continue;
      const [cx, cy] = cellCenter(state, r, c);
      const d = (cx - x) ** 2 + (cy - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = [r, c];
      }
    }
  }
  return best;
}

/** Simulates a shot (wall bounces included) and returns its path and the cell it snaps to. */
export function traceShot(state: BubbleState, angle: number): { path: [number, number][]; cell: Cell } {
  const a = clampAim(angle);
  let dx = Math.sin(a);
  const dy = -Math.cos(a);
  let x = LAUNCH_X;
  let y = LAUNCH_Y;
  const path: [number, number][] = [[x, y]];
  const ceilingY = 0.5 + state.ceiling * ROW_H;
  const occupied: [number, number][] = [];
  state.grid.forEach((row, r) => row.forEach((c, col) => c !== null && occupied.push(cellCenter(state, r, col))));
  for (let i = 0; i < 20000; i++) {
    x += dx * STEP;
    y += dy * STEP;
    if (x < 0.5) {
      x = 1 - x;
      dx = -dx;
      path.push([0.5, y]);
    } else if (x > FIELD_W - 0.5) {
      x = 2 * (FIELD_W - 0.5) - x;
      dx = -dx;
      path.push([FIELD_W - 0.5, y]);
    }
    if (y <= ceilingY) {
      y = ceilingY;
      break;
    }
    if (occupied.some(([ox, oy]) => (ox - x) ** 2 + (oy - y) ** 2 < HIT_DIST * HIT_DIST)) break;
  }
  path.push([x, y]);
  const cell = snapCell(state, x, y);
  path.push(cellCenter(state, cell[0], cell[1]));
  return { path, cell };
}

function sameColorGroup(grid: Grid, start: Cell): Cell[] {
  const color = getCell(grid, start[0], start[1]);
  const seen = new Set<string>([`${start[0]},${start[1]}`]);
  const out: Cell[] = [start];
  for (let i = 0; i < out.length; i++) {
    for (const [r, c] of neighbors(out[i][0], out[i][1])) {
      const key = `${r},${c}`;
      if (seen.has(key) || getCell(grid, r, c) !== color) continue;
      seen.add(key);
      out.push([r, c]);
    }
  }
  return out;
}

/** Bubbles no longer connected to the ceiling. */
export function floatingCells(grid: Grid): Cell[] {
  const seen = new Set<string>();
  const queue: Cell[] = [];
  (grid[0] ?? []).forEach((c, col) => {
    if (c !== null) {
      seen.add(`0,${col}`);
      queue.push([0, col]);
    }
  });
  for (let i = 0; i < queue.length; i++) {
    for (const [r, c] of neighbors(queue[i][0], queue[i][1])) {
      const key = `${r},${c}`;
      if (seen.has(key) || getCell(grid, r, c) === null) continue;
      seen.add(key);
      queue.push([r, c]);
    }
  }
  const out: Cell[] = [];
  grid.forEach((row, r) => row.forEach((c, col) => c !== null && !seen.has(`${r},${col}`) && out.push([r, col])));
  return out;
}

export function fireShot(state: BubbleState, angle: number): ShotResult | null {
  if (state.over) return null;
  const { path, cell } = traceShot(state, angle);
  const grid = cloneGrid(state.grid);
  const color = state.current;
  setCell(grid, cell[0], cell[1], color);

  let popped: Cell[] = [];
  let dropped: Cell[] = [];
  const group = sameColorGroup(grid, cell);
  if (group.length >= 3) {
    popped = group;
    for (const [r, c] of popped) grid[r][c] = null;
    dropped = floatingCells(grid);
    for (const [r, c] of dropped) grid[r][c] = null;
  }
  trimGrid(grid);

  let misses = popped.length ? 0 : state.misses + 1;
  let ceiling = state.ceiling;
  let ceilingDropped = false;
  if (misses >= state.config.missesPerDrop) {
    misses = 0;
    ceiling++;
    ceilingDropped = true;
  }

  const remaining = colorsOnBoard(grid);
  let draws = state.draws;
  let current = state.next;
  if (remaining.length && !remaining.includes(current)) current = drawColor(state.seed, draws++, grid, current);
  const next = drawColor(state.seed, draws++, grid, current);

  const shotsLeft = state.shotsLeft - 1;
  const cleared = grid.length === 0;
  const overflow = !cleared && grid.length + ceiling > MAX_ROWS;
  const result: BubbleState = {
    ...state,
    grid,
    ceiling,
    current,
    next,
    shotsLeft,
    misses,
    draws,
    cleared,
    overflow,
    over: cleared || overflow || shotsLeft <= 0,
  };
  return { state: result, path, placed: cell, popped, dropped, ceilingDropped, color };
}

export function swapBubbles(state: BubbleState): BubbleState {
  if (state.over || state.current === state.next) return state;
  return { ...state, current: state.next, next: state.current };
}

export function clearedRatio(state: BubbleState): number {
  return state.initialCount ? 1 - countBubbles(state.grid) / state.initialCount : 1;
}

export function bubbleStars(state: BubbleState): 1 | 2 | 3 {
  if (state.cleared) return 3;
  return clearedRatio(state) >= 0.7 ? 2 : 1;
}
