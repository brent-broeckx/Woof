import { describe, expect, it } from 'vitest';
import { PUZZLES } from '../../data/puzzles';
import { PUZZLE_COUNT, puzzleSlots } from '../progression/levels';
import { applyPowerUp } from '../economy/powerups';
import { findHint } from './hints';
import { computeStars, createGame, gameReducer, type GameState } from './game';
import { generatePuzzle, puzzleKey } from './generator';
import { solveLogically } from './logicSolver';
import { findSolutions, isValidSolution } from './solver';

describe('shipped puzzles', () => {
  it('has one puzzle per slot with the planned size', () => {
    const slots = puzzleSlots();
    expect(PUZZLES).toHaveLength(PUZZLE_COUNT);
    slots.forEach((slot, i) => {
      expect(PUZZLES[i].id).toBe(slot.puzzleIndex);
      expect(PUZZLES[i].size).toBe(slot.size);
    });
  });

  it('every puzzle is valid, unique and solvable by logic alone', () => {
    for (const p of PUZZLES) {
      expect(isValidSolution(p, p.solution)).toBe(true);
      expect(findSolutions(p, 2)).toHaveLength(1);
      const logic = solveLogically(p);
      expect(logic.solved).toBe(true);
      expect(logic.solution).toEqual(p.solution);
      expect(new Set(p.regions).size).toBe(p.size);
    }
  });

  it('respects the per-world technique limits', () => {
    puzzleSlots().forEach((slot, i) => {
      expect(PUZZLES[i].difficulty.maxDifficulty).toBeLessThanOrEqual(slot.maxDifficulty);
    });
  });

  it('contains no duplicates (including rotations/mirrors)', () => {
    expect(new Set(PUZZLES.map(puzzleKey)).size).toBe(PUZZLES.length);
  });
});

describe('generator', () => {
  it('is deterministic per seed', () => {
    const a = generatePuzzle({ size: 7, seed: 42 });
    const b = generatePuzzle({ size: 7, seed: 42 });
    expect(a).toEqual(b);
  });

  it('produces unique solutions for many seeds', () => {
    for (let seed = 0; seed < 25; seed++) {
      const p = generatePuzzle({ size: 6 + (seed % 3), seed })!;
      expect(p).not.toBeNull();
      expect(findSolutions(p, 2)).toHaveLength(1);
      expect(findSolutions(p, 2)[0]).toEqual(p.solution);
    }
  });
});

describe('game reducer', () => {
  const puzzle = PUZZLES[0];
  const solCell = (row: number) => row * puzzle.size + puzzle.solution[row];
  const wrongCell = () => {
    for (let c = 0; c < puzzle.size; c++) if (c !== puzzle.solution[0]) return c;
    return -1;
  };

  it('toggles crosses and undoes them', () => {
    let s = createGame(1, puzzle);
    s = gameReducer(s, { type: 'toggleX', cell: 0 });
    expect(s.marks[0]).toBe('x');
    s = gameReducer(s, { type: 'undo' });
    expect(s.marks[0]).toBe('empty');
  });

  it('costs a bone for a wrong dog and loses at zero', () => {
    let s = createGame(1, puzzle);
    const bad = wrongCell();
    s = gameReducer(s, { type: 'placeDog', cell: bad, autoCross: true });
    expect(s.bones).toBe(2);
    expect(s.marks[bad]).toBe('autoX');
    s = gameReducer(s, { type: 'placeDog', cell: bad, autoCross: true });
    s = gameReducer(s, { type: 'placeDog', cell: bad, autoCross: true });
    expect(s.status).toBe('lost');
  });

  it('wins when all dogs are placed, with auto-cross', () => {
    let s = createGame(1, puzzle);
    s = gameReducer(s, { type: 'placeDog', cell: solCell(0), autoCross: true });
    expect(s.marks.filter((m) => m === 'autoX').length).toBeGreaterThan(0);
    for (let r = 1; r < puzzle.size; r++) s = gameReducer(s, { type: 'placeDog', cell: solCell(r), autoCross: true });
    expect(s.status).toBe('won');
    expect(computeStars(s)).toBe(3);
  });

  it('hints can drive a full solve', () => {
    for (const p of PUZZLES.slice(0, 20)) {
      let s: GameState = createGame(1, p);
      for (let guard = 0; guard < 500 && s.status === 'playing'; guard++) {
        const h = findHint(p, s.marks);
        expect(h?.kind).toBe('deduction');
        if (h?.kind !== 'deduction') break;
        const d = h.deduction;
        if (d.kind === 'place') s = gameReducer(s, { type: 'placeDog', cell: d.cells[0], autoCross: false });
        else s = gameReducer(s, { type: 'paint', cells: d.cells, value: true, newStroke: true });
      }
      expect(s.status).toBe('won');
      expect(s.mistakes).toBe(0);
    }
  });

  it('reports wrong crosses as mistakes', () => {
    let s = createGame(1, puzzle);
    s = gameReducer(s, { type: 'toggleX', cell: solCell(1) });
    expect(findHint(puzzle, s.marks)).toEqual({ kind: 'mistake', cells: [solCell(1)] });
  });
});

describe('power-ups', () => {
  const puzzle = PUZZLES[40];
  const fresh = () => createGame(40, puzzle);

  it('sniff places the right dog of the tapped yard', () => {
    const r = applyPowerUp(fresh(), 'sniff', { target: 0, autoCross: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dogCell = r.state.marks.indexOf('dog');
    expect(puzzle.regions[dogCell]).toBe(puzzle.regions[0]);
    expect(r.state.powerUpsUsed).toBe(1);
  });

  it('fetch leaves exactly the dog and one decoy open in the row', () => {
    const r = applyPowerUp(fresh(), 'fetch', { target: 0, autoCross: true });
    if (!r.ok) throw new Error(r.message);
    const row = r.state.marks.slice(0, puzzle.size);
    expect(row.filter((m) => m === 'empty')).toHaveLength(2);
    expect(row[puzzle.solution[0]]).toBe('empty');
  });

  it('extra bone revives a lost level', () => {
    let s = fresh();
    const bad = puzzle.solution[0] === 0 ? 2 : 0;
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'placeDog', cell: bad, autoCross: true });
    expect(s.status).toBe('lost');
    expect(applyPowerUp(s, 'flashlight', { autoCross: true }).ok).toBe(false);
    const e = applyPowerUp(s, 'extraBone', { autoCross: true });
    if (!e.ok) throw new Error(e.message);
    expect(e.state.status).toBe('playing');
    expect(e.state.bones).toBe(1);
  });

  it('limits power-ups per level', () => {
    let s = fresh();
    for (const id of ['extraBone', 'flashlight', 'guideDog'] as const) {
      const r = applyPowerUp(s, id, { autoCross: true });
      if (!r.ok) throw new Error(r.message);
      s = r.state;
    }
    expect(applyPowerUp(s, 'sniff', { target: 0, autoCross: true }).ok).toBe(false);
  });

  const dogsOf = (s: GameState) => s.marks.map((m, i) => (m === 'dog' ? i : -1)).filter((i) => i >= 0);
  const isSol = (cell: number) => puzzle.solution[Math.floor(cell / puzzle.size)] === cell % puzzle.size;

  it('guide dog places exactly 3 new correct dogs', () => {
    for (const p of [PUZZLES[0], PUZZLES[40], PUZZLES[PUZZLES.length - 1]]) {
      const r = applyPowerUp(createGame(1, p), 'guideDog', { autoCross: true });
      if (!r.ok) throw new Error(r.message);
      const dogs = dogsOf(r.state);
      expect(dogs).toHaveLength(3);
      for (const c of dogs) expect(p.solution[Math.floor(c / p.size)]).toBe(c % p.size);
    }
  });

  it('guide dog keeps existing dogs and only adds new ones', () => {
    let s = fresh();
    const own = [0, 1].map((r) => r * puzzle.size + puzzle.solution[r]);
    for (const c of own) s = gameReducer(s, { type: 'placeDog', cell: c, autoCross: true });
    const r = applyPowerUp(s, 'guideDog', { autoCross: true });
    if (!r.ok) throw new Error(r.message);
    const dogs = dogsOf(r.state);
    expect(dogs).toHaveLength(5);
    for (const c of own) expect(dogs).toContain(c);
    for (const c of dogs) expect(isSol(c)).toBe(true);
  });

  it('guide dog finishes the level when 3 or fewer dogs remain', () => {
    let s = fresh();
    for (let r = 0; r < puzzle.size - 2; r++) s = gameReducer(s, { type: 'placeDog', cell: r * puzzle.size + puzzle.solution[r], autoCross: true });
    const r = applyPowerUp(s, 'guideDog', { autoCross: true });
    if (!r.ok) throw new Error(r.message);
    expect(dogsOf(r.state)).toHaveLength(puzzle.size);
    expect(r.state.status).toBe('won');
  });
});
