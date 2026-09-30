import type { Puzzle, UnitRef } from './types';

export const rowOf = (cell: number, size: number) => Math.floor(cell / size);
export const colOf = (cell: number, size: number) => cell % size;

/** The 8 surrounding cells. */
export function neighbors(cell: number, size: number): number[] {
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
    }
  }
  return out;
}

/** Up/down/left/right cells. */
export function orthogonal(cell: number, size: number): number[] {
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

/** Units are indexed 0..3N-1: rows, then cols, then regions. */
export function unitCells(puzzle: Pick<Puzzle, 'size' | 'regions'>): number[][] {
  const { size, regions } = puzzle;
  const units: number[][] = Array.from({ length: size * 3 }, () => []);
  for (let cell = 0; cell < size * size; cell++) {
    units[rowOf(cell, size)].push(cell);
    units[size + colOf(cell, size)].push(cell);
    units[size * 2 + regions[cell]].push(cell);
  }
  return units;
}

export function unitRef(unit: number, size: number): UnitRef {
  if (unit < size) return { type: 'row', index: unit };
  if (unit < size * 2) return { type: 'col', index: unit - size };
  return { type: 'region', index: unit - size * 2 };
}

export function unitsOfCell(cell: number, puzzle: Pick<Puzzle, 'size' | 'regions'>): number[] {
  const { size } = puzzle;
  return [rowOf(cell, size), size + colOf(cell, size), size * 2 + puzzle.regions[cell]];
}

/** Every cell that a dog on `cell` rules out (row, column, region, neighbours), excluding the cell itself. */
export function attackedCells(cell: number, puzzle: Pick<Puzzle, 'size' | 'regions'>): number[] {
  const { size, regions } = puzzle;
  const r = rowOf(cell, size);
  const c = colOf(cell, size);
  const set = new Set<number>(neighbors(cell, size));
  for (let i = 0; i < size * size; i++) {
    if (i === cell) continue;
    if (rowOf(i, size) === r || colOf(i, size) === c || regions[i] === regions[cell]) set.add(i);
  }
  return [...set];
}

export function solutionCells(puzzle: Puzzle): number[] {
  return puzzle.solution.map((col, row) => row * puzzle.size + col);
}

export const REGION_NAMES = ['pink', 'blue', 'yellow', 'green', 'purple', 'orange', 'teal', 'red', 'lilac', 'brown', 'grey'];

export function describeUnit(ref: UnitRef): string {
  if (ref.type === 'row') return `row ${ref.index + 1}`;
  if (ref.type === 'col') return `column ${ref.index + 1}`;
  return `the ${REGION_NAMES[ref.index] ?? `#${ref.index + 1}`} yard`;
}
