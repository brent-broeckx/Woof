import { describe, expect, it } from 'vitest';
import { CAFE_LEVELS, applyCafeCompletion, cafeConfig, cafeNext, emptyCafe, normalizeCafe } from '../progression/catCafe';
import { generateReliably } from '../../workers/generate';
import { findHint } from './hints';
import { createGame, gameReducer } from './game';
import { solveLogically } from './logicSolver';
import { findSolutions, isValidSolution } from './solver';
import type { Puzzle } from './types';

const catPuzzle = (seed: number, size = 7, cats = 4): Puzzle => generateReliably({ size, seed, maxDifficulty: 4, cats });

describe('cats twist', () => {
  it('generates unique, logic-solvable puzzles with cats off the solution', () => {
    for (const seed of [1, 2, 3]) {
      const p = catPuzzle(seed);
      expect(p.cats).toHaveLength(4);
      const sol = new Set(p.solution.map((c, r) => r * p.size + c));
      for (const cat of p.cats!) expect(sol.has(cat)).toBe(false);
      expect(findSolutions(p, 2)).toHaveLength(1);
      expect(solveLogically(p, 6).solved).toBe(true);
    }
  });

  it('solver and validator respect cats', () => {
    const p = catPuzzle(5);
    const bad = [...p.solution];
    expect(isValidSolution(p, bad)).toBe(true);
    const r = 0;
    const blocked = { ...p, cats: [r * p.size + p.solution[r]] };
    expect(isValidSolution(blocked, bad)).toBe(false);
    expect(findSolutions(blocked, 2).every((s) => s[r] !== p.solution[r])).toBe(true);
  });

  it('cat cells cannot be crossed, painted or given a dog', () => {
    const p = catPuzzle(7);
    const cat = p.cats![0];
    let s = createGame(1, p);
    expect(s.marks[cat]).toBe('cat');
    s = gameReducer(s, { type: 'toggleX', cell: cat });
    s = gameReducer(s, { type: 'paint', cells: [cat], value: true, newStroke: true });
    s = gameReducer(s, { type: 'placeDog', cell: cat, autoCross: true });
    expect(s.marks[cat]).toBe('cat');
    expect(s.bones).toBe(createGame(1, p).bones);
    for (let r = 0; r < p.size; r++) s = gameReducer(s, { type: 'placeDog', cell: r * p.size + p.solution[r], autoCross: true });
    expect(s.status).toBe('won');
    expect(s.marks[cat]).toBe('cat');
  });

  it('hints never point at a cat', () => {
    const p = catPuzzle(9);
    const hint = findHint(p, createGame(1, p).marks);
    expect(hint?.kind).toBe('deduction');
    if (hint?.kind === 'deduction') for (const cat of p.cats!) expect(hint.deduction.cells).not.toContain(cat);
  });

  it('plain puzzles are unchanged by the option', () => {
    const a = generateReliably({ size: 6, seed: 42, maxDifficulty: 3 });
    expect(a.cats).toBeUndefined();
    expect(generateReliably({ size: 6, seed: 42, maxDifficulty: 3 })).toEqual(a);
  });
});

describe('cat café', () => {
  it('ramps up size and cats, and every level generates', { timeout: 60_000 }, () => {
    let prev = cafeConfig(1);
    for (let l = 1; l <= CAFE_LEVELS; l++) {
      const cfg = cafeConfig(l);
      expect(cfg.size).toBeGreaterThanOrEqual(prev.size);
      expect(cfg.cats).toBeGreaterThanOrEqual(prev.cats);
      prev = cfg;
      if (l % 6 === 0 || l === 1) {
        const p = generateReliably(cfg);
        expect(p.cats?.length).toBe(cfg.cats);
        expect(findSolutions(p, 2)).toHaveLength(1);
      }
    }
  });

  it('rewards first clears and first 3-star runs once', () => {
    let r = applyCafeCompletion(emptyCafe(), 1, 2);
    expect(r.firstClear).toBe(true);
    expect(r.kibble).toBeGreaterThan(0);
    expect(r.treats).toBeGreaterThan(0);
    expect(cafeNext(r.state)).toBe(2);
    r = applyCafeCompletion(r.state, 1, 3);
    expect(r).toMatchObject({ firstClear: false, firstPerfect: true, treats: 0 });
    r = applyCafeCompletion(r.state, 1, 3);
    expect(r.kibble).toBe(0);
  });

  it('normalizes bad saves', () => {
    expect(normalizeCafe({ stars: { 1: 3, 2: 9, 0: 2, 99: 1, x: 2 } })).toEqual({ stars: { 1: 3, 2: 3 } });
    expect(normalizeCafe(null)).toEqual({ stars: {} });
  });
});
