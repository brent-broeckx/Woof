import type { Difficulty, PuzzleLevel } from './types';

/** Compact JSON form: regions as a string of letters (A = region 0). */
export interface EncodedPuzzle {
  id: number;
  size: number;
  regions: string;
  solution: number[];
  difficulty: Difficulty;
}

export function encodePuzzle(p: PuzzleLevel): EncodedPuzzle {
  return {
    id: p.id,
    size: p.size,
    regions: p.regions.map((r) => String.fromCharCode(65 + r)).join(''),
    solution: p.solution,
    difficulty: p.difficulty,
  };
}

export function decodePuzzle(e: EncodedPuzzle): PuzzleLevel {
  return {
    id: e.id,
    size: e.size,
    regions: [...e.regions].map((ch) => ch.charCodeAt(0) - 65),
    solution: e.solution,
    difficulty: e.difficulty,
  };
}
