import { createRng, type Rng } from '../rng';
import { colOf, orthogonal, rowOf } from './geometry';
import { solveLogically } from './logicSolver';
import { findSolutions } from './solver';
import type { Difficulty, Puzzle } from './types';

export interface GenerateOptions {
  size: number;
  seed: number;
  /** Highest technique difficulty allowed (1-6). Puzzles needing more are rejected. */
  maxDifficulty?: number;
  /** Lowest technique difficulty accepted; easier puzzles are rejected. */
  minDifficulty?: number;
  maxAttempts?: number;
}

export interface GeneratedPuzzle extends Puzzle {
  difficulty: Difficulty;
  seed: number;
}

/** Random column permutation where consecutive rows' dogs never touch. */
export function randomPlacement(size: number, rng: Rng): number[] | null {
  const result: number[] = [];
  const used = new Set<number>();
  const rec = (row: number): boolean => {
    if (row === size) return true;
    const cols = rng.shuffle([...Array(size).keys()]);
    for (const c of cols) {
      if (used.has(c)) continue;
      if (row > 0 && Math.abs(result[row - 1] - c) <= 1) continue;
      used.add(c);
      result.push(c);
      if (rec(row + 1)) return true;
      used.delete(c);
      result.pop();
    }
    return false;
  };
  return rec(0) ? result : null;
}

/** Grow one region from each dog with randomised, weighted flood fill. */
export function growRegions(size: number, solution: number[], rng: Rng): number[] {
  const regions = new Array(size * size).fill(-1);
  // Shuffle which dog gets which region id so colours are not ordered by row.
  const ids = rng.shuffle([...Array(size).keys()]);
  const weights = ids.map(() => 0.15 + rng.next() ** 1.6 * 2);
  solution.forEach((col, row) => {
    regions[row * size + col] = ids[row];
  });
  let remaining = size * size - size;
  while (remaining > 0) {
    const frontier: [number, number, number][] = [];
    for (let cell = 0; cell < size * size; cell++) {
      if (regions[cell] !== -1) continue;
      for (const n of orthogonal(cell, size)) {
        const reg = regions[n];
        if (reg !== -1) frontier.push([cell, reg, weights[reg]]);
      }
    }
    const [cell, reg] = rng.weighted(frontier.map((f) => [[f[0], f[1]] as const, f[2]] as const));
    regions[cell] = reg;
    remaining--;
  }
  return regions;
}

function regionConnectedWithout(regions: number[], size: number, reg: number, removed: number): boolean {
  const cells = regions.map((r, i) => (r === reg && i !== removed ? i : -1)).filter((i) => i >= 0);
  if (cells.length === 0) return false;
  const seen = new Set<number>([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of orthogonal(cur, size)) {
      if (n !== removed && regions[n] === reg && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Reassign cells until the intended solution is the only one.
 * Moving an alternate solution's dog cell into a neighbouring region gives that
 * region two dogs in the alternate solution, killing it, while the intended one survives.
 */
export function makeUnique(size: number, regions: number[], solution: number[], rng: Rng, maxIterations = 300): boolean {
  const solCells = new Set(solution.map((c, r) => r * size + c));
  for (let it = 0; it < maxIterations; it++) {
    const sols = findSolutions({ size, regions }, 2);
    const alt = sols.find((s) => s.some((c, r) => c !== solution[r]));
    if (!alt) return true;
    const candidates = rng.shuffle(alt.map((c, r) => r * size + c).filter((cell) => !solCells.has(cell)));
    let changed = false;
    for (const cell of candidates) {
      const reg = regions[cell];
      const neighborRegs = rng.shuffle([
        ...new Set(
          orthogonal(cell, size)
            .map((n) => regions[n])
            .filter((r) => r !== reg),
        ),
      ]);
      if (!neighborRegs.length || !regionConnectedWithout(regions, size, reg, cell)) continue;
      regions[cell] = neighborRegs[0];
      changed = true;
      break;
    }
    if (!changed) return false;
  }
  return false;
}

export function generatePuzzle(options: GenerateOptions): GeneratedPuzzle | null {
  const { size, seed, maxDifficulty = 6, minDifficulty = 1, maxAttempts = 60 } = options;
  const rng = createRng(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = randomPlacement(size, rng);
    if (!solution) return null;
    const regions = growRegions(size, solution, rng);
    if (!makeUnique(size, regions, solution, rng)) continue;
    const logic = solveLogically({ size, regions }, maxDifficulty);
    if (!logic.solved) continue;
    if (logic.difficulty.maxDifficulty < minDifficulty) continue;
    if (logic.solution.some((c, r) => c !== solution[r])) continue;
    return { size, regions: normalizeRegions(regions, size), solution, difficulty: logic.difficulty, seed };
  }
  return null;
}

/** Renumber regions in reading order of their first cell (nicer colour ordering). */
export function normalizeRegions(regions: number[], size: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < size * size; i++) {
    if (!map.has(regions[i])) map.set(regions[i], map.size);
  }
  return regions.map((r) => map.get(r)!);
}

/** Canonical key for deduplicating (includes rotations/mirrors). */
export function puzzleKey(p: Puzzle): string {
  const { size } = p;
  const variants: string[] = [];
  const transforms: ((r: number, c: number) => [number, number])[] = [
    (r, c) => [r, c],
    (r, c) => [c, size - 1 - r],
    (r, c) => [size - 1 - r, size - 1 - c],
    (r, c) => [size - 1 - c, r],
    (r, c) => [r, size - 1 - c],
    (r, c) => [size - 1 - r, c],
    (r, c) => [c, r],
    (r, c) => [size - 1 - c, size - 1 - r],
  ];
  for (const t of transforms) {
    const out = new Array(size * size);
    for (let cell = 0; cell < size * size; cell++) {
      const [nr, nc] = t(rowOf(cell, size), colOf(cell, size));
      out[nr * size + nc] = p.regions[cell];
    }
    variants.push(normalizeRegions(out, size).join(','));
  }
  return variants.sort()[0];
}
