import type { Puzzle } from './types';

/**
 * Exact backtracking solver. Returns up to `limit` solutions
 * (each solution = column of the dog per row).
 */
type Shape = Pick<Puzzle, 'size' | 'regions' | 'cats'>;

export function findSolutions(puzzle: Shape, limit = 2): number[][] {
  const { size, regions } = puzzle;
  const blocked = new Set(puzzle.cats ?? []);
  const results: number[][] = [];
  const current: number[] = new Array(size).fill(-1);

  const rec = (row: number, usedCols: number, usedRegions: number, prevCol: number) => {
    if (results.length >= limit) return;
    if (row === size) {
      results.push([...current]);
      return;
    }
    for (let col = 0; col < size; col++) {
      if (usedCols & (1 << col)) continue;
      if (prevCol >= 0 && Math.abs(prevCol - col) <= 1) continue;
      if (blocked.has(row * size + col)) continue;
      const reg = regions[row * size + col];
      if (usedRegions & (1 << reg)) continue;
      current[row] = col;
      rec(row + 1, usedCols | (1 << col), usedRegions | (1 << reg), col);
      if (results.length >= limit) return;
    }
  };
  rec(0, 0, 0, -1);
  return results;
}

export function countSolutions(puzzle: Shape, limit = 2): number {
  return findSolutions(puzzle, limit).length;
}

/** Checks a full placement against all rules. */
export function isValidSolution(puzzle: Shape, solution: number[]): boolean {
  const { size, regions } = puzzle;
  const blocked = new Set(puzzle.cats ?? []);
  if (solution.length !== size) return false;
  const cols = new Set<number>();
  const regs = new Set<number>();
  for (let r = 0; r < size; r++) {
    const c = solution[r];
    if (c < 0 || c >= size || cols.has(c) || blocked.has(r * size + c)) return false;
    cols.add(c);
    const reg = regions[r * size + c];
    if (regs.has(reg)) return false;
    regs.add(reg);
    if (r > 0 && Math.abs(solution[r - 1] - c) <= 1) return false;
  }
  return regs.size === size;
}
