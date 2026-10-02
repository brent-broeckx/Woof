import { generatePuzzle } from '../core/puzzle/generator';
import type { Puzzle } from '../core/puzzle/types';

export interface GenerateRequest {
  id: number;
  size: number;
  seed: number;
  maxDifficulty: number;
  /** Preferred minimum difficulty; relaxed if no puzzle is found in time. */
  minDifficulty?: number;
}

/** Deterministic: the same request always yields the same puzzle. */
export function generateReliably({ size, seed, maxDifficulty, minDifficulty }: Omit<GenerateRequest, 'id'>): Puzzle {
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = generatePuzzle({
      size,
      seed: seed + attempt * 7919,
      maxDifficulty: maxDifficulty + Math.floor(attempt / 10),
      minDifficulty: attempt < 20 ? minDifficulty : undefined,
    });
    if (p) return { size: p.size, regions: p.regions, solution: p.solution };
  }
  throw new Error(`Could not generate a ${size}×${size} puzzle`);
}
