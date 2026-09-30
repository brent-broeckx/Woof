export interface Puzzle {
  size: number;
  /** Region index for each cell, row-major, length size*size. */
  regions: number[];
  /** Column of the dog for each row. */
  solution: number[];
}

export type TechniqueId =
  | 'lastCell'
  | 'confinement'
  | 'blocksUnit'
  | 'pigeonhole2'
  | 'pigeonhole3'
  | 'contradiction';

export interface Difficulty {
  score: number;
  maxDifficulty: number;
  maxTechnique: TechniqueId | 'none';
  steps: Partial<Record<TechniqueId, number>>;
}

export interface PuzzleLevel extends Puzzle {
  id: number;
  difficulty: Difficulty;
}

export type UnitType = 'row' | 'col' | 'region';

export interface UnitRef {
  type: UnitType;
  index: number;
}
