import { orthogonal } from '../../core/puzzle/geometry';
import { createRng } from '../../core/rng';

/** Sliding Pup — classic sliding tile puzzle. 0 is the gap; solved = 1..n²-1 then 0. */

export interface SlidingConfig {
  size: number;
  scrambleMoves: number;
}

export function slidingConfigForTier(tier: number): SlidingConfig {
  if (tier <= 3) return { size: 3, scrambleMoves: 30 + tier * 5 };
  return { size: 4, scrambleMoves: Math.min(60, 26 + tier * 2) };
}

export const solvedTiles = (size: number) => [...Array.from({ length: size * size - 1 }, (_, i) => i + 1), 0];

export function isSolvedTiles(tiles: number[]): boolean {
  return tiles.every((t, i) => (i === tiles.length - 1 ? t === 0 : t === i + 1));
}

/** Random walk from the solved state — always solvable. Returns tiles and the walk length. */
export function scramble(size: number, moves: number, seed: number): { tiles: number[]; walk: number } {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 10; attempt++) {
    const tiles = solvedTiles(size);
    let gap = tiles.length - 1;
    let prev = -1;
    for (let i = 0; i < moves; i++) {
      const options = orthogonal(gap, size).filter((n) => n !== prev);
      const n = rng.pick(options);
      tiles[gap] = tiles[n];
      tiles[n] = 0;
      prev = gap;
      gap = n;
    }
    if (!isSolvedTiles(tiles)) return { tiles, walk: moves };
  }
  return { tiles: solvedTiles(size), walk: 0 };
}

export function canSlide(tiles: number[], size: number, index: number): boolean {
  return orthogonal(index, size).includes(tiles.indexOf(0));
}

export function slide(tiles: number[], size: number, index: number): number[] | null {
  if (!canSlide(tiles, size, index)) return null;
  const next = [...tiles];
  const gap = tiles.indexOf(0);
  next[gap] = tiles[index];
  next[index] = 0;
  return next;
}

function manhattan(tiles: number[], size: number): number {
  let d = 0;
  tiles.forEach((t, i) => {
    if (t === 0) return;
    const goal = t - 1;
    d += Math.abs(Math.floor(goal / size) - Math.floor(i / size)) + Math.abs((goal % size) - (i % size));
  });
  return d;
}

/** IDA* with Manhattan distance. Returns optimal move count, or null if the node budget runs out. */
export function optimalMoves(tiles: number[], size: number, nodeBudget = 400_000): number | null {
  const board = [...tiles];
  let gap = board.indexOf(0);
  let nodes = 0;
  let bound = manhattan(board, size);
  const search = (g: number, h: number, prev: number): number => {
    const f = g + h;
    if (f > bound) return f;
    if (h === 0) return -1;
    if (++nodes > nodeBudget) return Infinity;
    let min = Infinity;
    for (const n of orthogonal(gap, size)) {
      if (n === prev) continue;
      const tile = board[n];
      const goal = tile - 1;
      const gr = Math.floor(goal / size);
      const gc = goal % size;
      const before = Math.abs(gr - Math.floor(n / size)) + Math.abs(gc - (n % size));
      const after = Math.abs(gr - Math.floor(gap / size)) + Math.abs(gc - (gap % size));
      board[gap] = tile;
      board[n] = 0;
      const oldGap = gap;
      gap = n;
      const t = search(g + 1, h - before + after, oldGap);
      gap = oldGap;
      board[n] = tile;
      board[gap] = 0;
      if (t === -1) return -1;
      if (t < min) min = t;
    }
    return min;
  };
  for (let i = 0; i < 80; i++) {
    const t = search(0, manhattan(board, size), -1);
    if (t === -1) return bound;
    if (t === Infinity) return null;
    bound = t;
  }
  return null;
}

export function slidingStars(moves: number, target: number): 1 | 2 | 3 {
  if (moves <= Math.ceil(target * 1.3) + 2) return 3;
  if (moves <= target * 2 + 6) return 2;
  return 1;
}
