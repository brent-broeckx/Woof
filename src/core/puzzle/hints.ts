import type { CellMark } from './game';
import { isCrossed } from './game';
import { applyDeduction, createLogicState, findNextDeduction, type Deduction } from './logicSolver';
import { solutionCells } from './geometry';
import type { Puzzle } from './types';

export type Hint = { kind: 'mistake'; cells: number[] } | { kind: 'deduction'; deduction: Deduction };

/**
 * Finds the easiest deduction the player hasn't already made.
 * Wrong crosses are reported first since they would make the puzzle unsolvable.
 */
export function findHint(puzzle: Puzzle, marks: CellMark[], maxDifficulty = 6): Hint | null {
  const sol = new Set(solutionCells(puzzle));
  const wrong = marks.map((m, i) => (isCrossed(m) && sol.has(i) ? i : -1)).filter((i) => i >= 0);
  if (wrong.length) return { kind: 'mistake', cells: wrong };

  const dogs = marks.map((m, i) => (m === 'dog' ? i : -1)).filter((i) => i >= 0);
  const state = createLogicState(puzzle, dogs);
  for (let guard = 0; guard < puzzle.size * puzzle.size * 2; guard++) {
    const d = findNextDeduction(state, maxDifficulty);
    if (!d) return null;
    if (d.kind === 'place') {
      if (marks[d.cells[0]] !== 'dog') return { kind: 'deduction', deduction: d };
    } else {
      const fresh = d.cells.filter((c) => marks[c] === 'empty');
      if (fresh.length) return { kind: 'deduction', deduction: { ...d, cells: fresh } };
    }
    applyDeduction(state, d);
  }
  return null;
}
