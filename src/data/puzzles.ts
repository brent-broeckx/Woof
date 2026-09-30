import puzzlesJson from './puzzles.json';
import { decodePuzzle, type EncodedPuzzle } from '../core/puzzle/levelData';
import type { PuzzleLevel } from '../core/puzzle/types';

export const PUZZLES: PuzzleLevel[] = (puzzlesJson as EncodedPuzzle[]).map(decodePuzzle);
