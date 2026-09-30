import { attackedCells, colOf, describeUnit, rowOf, unitCells, unitRef } from './geometry';
import type { Difficulty, Puzzle, TechniqueId, UnitRef } from './types';

/**
 * Human-style logic solver. Used to (1) guarantee puzzles need no guessing,
 * (2) grade difficulty, and (3) power hints / power-ups.
 */

export const TECHNIQUES: Record<TechniqueId, { difficulty: number; weight: number; label: string }> = {
  lastCell: { difficulty: 1, weight: 1, label: 'Last open tile' },
  confinement: { difficulty: 2, weight: 3, label: 'Confined to a line' },
  blocksUnit: { difficulty: 3, weight: 6, label: 'Blocks a whole group' },
  pigeonhole2: { difficulty: 4, weight: 10, label: 'Two groups share two lines' },
  pigeonhole3: { difficulty: 5, weight: 15, label: 'Several groups share lines' },
  contradiction: { difficulty: 6, weight: 25, label: 'What-if contradiction' },
};

export interface Deduction {
  technique: TechniqueId;
  difficulty: number;
  kind: 'place' | 'eliminate';
  cells: number[];
  focus: UnitRef[];
  reason: string;
}

export interface LogicState {
  size: number;
  regions: number[];
  units: number[][];
  cand: boolean[];
  dogs: boolean[];
  unitDone: boolean[];
}

export function createLogicState(puzzle: Pick<Puzzle, 'size' | 'regions'>, dogCells: number[] = []): LogicState {
  const { size, regions } = puzzle;
  const state: LogicState = {
    size,
    regions,
    units: unitCells(puzzle),
    cand: new Array(size * size).fill(true),
    dogs: new Array(size * size).fill(false),
    unitDone: new Array(size * 3).fill(false),
  };
  for (const cell of dogCells) placeDog(state, cell);
  return state;
}

export function cloneState(s: LogicState): LogicState {
  return { ...s, cand: [...s.cand], dogs: [...s.dogs], unitDone: [...s.unitDone] };
}

export function placeDog(state: LogicState, cell: number): void {
  const { size } = state;
  state.dogs[cell] = true;
  state.cand[cell] = false;
  for (const a of attackedCells(cell, state)) state.cand[a] = false;
  state.unitDone[rowOf(cell, size)] = true;
  state.unitDone[size + colOf(cell, size)] = true;
  state.unitDone[size * 2 + state.regions[cell]] = true;
}

export function applyDeduction(state: LogicState, d: Deduction): void {
  if (d.kind === 'place') {
    for (const c of d.cells) placeDog(state, c);
  } else {
    for (const c of d.cells) state.cand[c] = false;
  }
}

const candsOf = (s: LogicState, unit: number) => s.units[unit].filter((c) => s.cand[c]);

/** Region units first so explanations talk about yards before lines. */
function unitOrder(size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) out.push(size * 2 + i);
  for (let i = 0; i < size * 2; i++) out.push(i);
  return out;
}

export function isSolved(s: LogicState): boolean {
  return s.unitDone.every(Boolean);
}

export function emptyUnit(s: LogicState): number {
  for (let u = 0; u < s.units.length; u++) {
    if (!s.unitDone[u] && candsOf(s, u).length === 0) return u;
  }
  return -1;
}

function findLastCell(s: LogicState): Deduction | null {
  for (const u of unitOrder(s.size)) {
    if (s.unitDone[u]) continue;
    const cands = candsOf(s, u);
    if (cands.length === 1) {
      const ref = unitRef(u, s.size);
      return {
        technique: 'lastCell',
        difficulty: 1,
        kind: 'place',
        cells: cands,
        focus: [ref],
        reason: `${cap(describeUnit(ref))} has only one open tile left, so the dog must go there.`,
      };
    }
  }
  return null;
}

function findConfinement(s: LogicState): Deduction | null {
  const { size, regions } = s;
  // A yard whose open tiles all lie in one line claims that line.
  for (let reg = 0; reg < size; reg++) {
    const u = size * 2 + reg;
    if (s.unitDone[u]) continue;
    const cands = candsOf(s, u);
    for (const lineType of ['row', 'col'] as const) {
      const lineOf = lineType === 'row' ? (c: number) => rowOf(c, size) : (c: number) => colOf(c, size);
      const lines = new Set(cands.map(lineOf));
      if (lines.size !== 1) continue;
      const line = [...lines][0];
      const lineUnit = lineType === 'row' ? line : size + line;
      const elim = candsOf(s, lineUnit).filter((c) => regions[c] !== reg);
      if (elim.length) {
        const yard = { type: 'region', index: reg } as const;
        const lineRef = { type: lineType, index: line } as const;
        return {
          technique: 'confinement',
          difficulty: 2,
          kind: 'eliminate',
          cells: elim,
          focus: [yard, lineRef],
          reason: `All open tiles of ${describeUnit(yard)} are in ${describeUnit(lineRef)}, so no other dog can live in ${describeUnit(lineRef)}.`,
        };
      }
    }
  }
  // A line whose open tiles all lie in one yard claims that yard.
  for (let u = 0; u < size * 2; u++) {
    if (s.unitDone[u]) continue;
    const cands = candsOf(s, u);
    const regs = new Set(cands.map((c) => regions[c]));
    if (regs.size !== 1) continue;
    const reg = [...regs][0];
    const elim = candsOf(s, size * 2 + reg).filter((c) => !s.units[u].includes(c));
    if (elim.length) {
      const lineRef = unitRef(u, size);
      const yard = { type: 'region', index: reg } as const;
      return {
        technique: 'confinement',
        difficulty: 2,
        kind: 'eliminate',
        cells: elim,
        focus: [lineRef, yard],
        reason: `Every open tile in ${describeUnit(lineRef)} belongs to ${describeUnit(yard)}, so that yard's dog must be in ${describeUnit(lineRef)}.`,
      };
    }
  }
  return null;
}

function findBlocksUnit(s: LogicState): Deduction | null {
  const { size } = s;
  for (let cell = 0; cell < size * size; cell++) {
    if (!s.cand[cell]) continue;
    const attacked = new Set(attackedCells(cell, s));
    for (const u of unitOrder(size)) {
      if (s.unitDone[u] || s.units[u].includes(cell)) continue;
      const cands = candsOf(s, u);
      if (cands.length > 0 && cands.every((c) => attacked.has(c))) {
        const ref = unitRef(u, size);
        return {
          technique: 'blocksUnit',
          difficulty: 3,
          kind: 'eliminate',
          cells: [cell],
          focus: [ref],
          reason: `A dog on this tile would block every open tile of ${describeUnit(ref)}, leaving it without a dog.`,
        };
      }
    }
  }
  return null;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

/**
 * k groups (yards or lines) whose open tiles fit inside exactly k "other" units
 * own those units completely.
 */
function findPigeonhole(s: LogicState, minK: number, maxK: number): Deduction | null {
  const { size, regions } = s;
  type Case = { groupType: 'region' | 'row' | 'col'; keyType: 'region' | 'row' | 'col' };
  const cases: Case[] = [
    { groupType: 'region', keyType: 'row' },
    { groupType: 'region', keyType: 'col' },
    { groupType: 'row', keyType: 'region' },
    { groupType: 'col', keyType: 'region' },
  ];
  const valueOf = (type: 'region' | 'row' | 'col', cell: number) =>
    type === 'region' ? regions[cell] : type === 'row' ? rowOf(cell, size) : colOf(cell, size);
  const unitIndex = (type: 'region' | 'row' | 'col', idx: number) => (type === 'row' ? idx : type === 'col' ? size + idx : size * 2 + idx);

  for (let k = minK; k <= maxK; k++) {
    for (const { groupType, keyType } of cases) {
      const groups: { idx: number; mask: number }[] = [];
      for (let g = 0; g < size; g++) {
        const u = unitIndex(groupType, g);
        if (s.unitDone[u]) continue;
        let mask = 0;
        for (const c of candsOf(s, u)) mask |= 1 << valueOf(keyType, c);
        if (popcount(mask) <= k) groups.push({ idx: g, mask });
      }
      if (groups.length < k) continue;
      const chosen: number[] = [];
      let found: Deduction | null = null;
      const rec = (start: number, mask: number) => {
        if (found) return;
        if (chosen.length === k) {
          if (popcount(mask) !== k) return;
          const groupSet = new Set(chosen.map((i) => groups[i].idx));
          const elim: number[] = [];
          for (let cell = 0; cell < size * size; cell++) {
            if (!s.cand[cell]) continue;
            if (mask & (1 << valueOf(keyType, cell)) && !groupSet.has(valueOf(groupType, cell))) elim.push(cell);
          }
          if (!elim.length) return;
          const groupRefs = [...groupSet].map((index) => ({ type: groupType, index }) as UnitRef);
          const keyRefs: UnitRef[] = [];
          for (let i = 0; i < size; i++) if (mask & (1 << i)) keyRefs.push({ type: keyType, index: i });
          found = {
            technique: k === 2 ? 'pigeonhole2' : 'pigeonhole3',
            difficulty: k === 2 ? 4 : 5,
            kind: 'eliminate',
            cells: elim,
            focus: [...groupRefs, ...keyRefs],
            reason: `${cap(listUnits(groupRefs))} can only use ${listUnits(keyRefs)}. ${k} dogs need ${k} spots there, so nothing else can go in ${listUnits(keyRefs)}.`,
          };
          return;
        }
        for (let i = start; i < groups.length; i++) {
          const next = mask | groups[i].mask;
          if (popcount(next) > k) continue;
          chosen.push(i);
          rec(i + 1, next);
          chosen.pop();
          if (found) return;
        }
      };
      rec(0, 0);
      if (found) return found;
    }
  }
  return null;
}

function propagateEasy(s: LogicState): boolean {
  // Returns true if a contradiction was reached.
  for (let guard = 0; guard < 200; guard++) {
    if (emptyUnit(s) >= 0) return true;
    const d = findLastCell(s) ?? findConfinement(s);
    if (!d) return false;
    applyDeduction(s, d);
  }
  return false;
}

function findContradiction(s: LogicState): Deduction | null {
  const { size } = s;
  for (let cell = 0; cell < size * size; cell++) {
    if (!s.cand[cell]) continue;
    const trial = cloneState(s);
    placeDog(trial, cell);
    if (propagateEasy(trial)) {
      const u = emptyUnit(trial);
      const ref = u >= 0 ? unitRef(u, size) : null;
      return {
        technique: 'contradiction',
        difficulty: 6,
        kind: 'eliminate',
        cells: [cell],
        focus: ref ? [ref] : [],
        reason: ref
          ? `If a dog sat here, following the easy steps would leave ${describeUnit(ref)} with no room for its dog.`
          : 'If a dog sat here, the rules would break a few steps later.',
      };
    }
  }
  return null;
}

export function findNextDeduction(s: LogicState, maxDifficulty = 6): Deduction | null {
  return (
    findLastCell(s) ??
    (maxDifficulty >= 2 ? findConfinement(s) : null) ??
    (maxDifficulty >= 3 ? findBlocksUnit(s) : null) ??
    (maxDifficulty >= 4 ? findPigeonhole(s, 2, 2) : null) ??
    (maxDifficulty >= 5 ? findPigeonhole(s, 3, 4) : null) ??
    (maxDifficulty >= 6 ? findContradiction(s) : null)
  );
}

export interface LogicSolveResult {
  solved: boolean;
  solution: number[];
  difficulty: Difficulty;
  deductions: Deduction[];
}

export function solveLogically(puzzle: Pick<Puzzle, 'size' | 'regions'>, maxDifficulty = 6): LogicSolveResult {
  const s = createLogicState(puzzle);
  const deductions: Deduction[] = [];
  const steps: Partial<Record<TechniqueId, number>> = {};
  let score = 0;
  let maxDiff = 0;
  let maxTechnique: TechniqueId | 'none' = 'none';
  while (!isSolved(s)) {
    const d = findNextDeduction(s, maxDifficulty);
    if (!d) break;
    applyDeduction(s, d);
    deductions.push(d);
    steps[d.technique] = (steps[d.technique] ?? 0) + 1;
    score += TECHNIQUES[d.technique].weight;
    if (d.difficulty > maxDiff) {
      maxDiff = d.difficulty;
      maxTechnique = d.technique;
    }
  }
  const solution = new Array(s.size).fill(-1);
  s.dogs.forEach((isDog, cell) => {
    if (isDog) solution[rowOf(cell, s.size)] = colOf(cell, s.size);
  });
  return {
    solved: isSolved(s),
    solution,
    difficulty: { score: score + s.size * 4, maxDifficulty: maxDiff, maxTechnique, steps },
    deductions,
  };
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function listUnits(refs: UnitRef[]): string {
  const names = refs.map(describeUnit);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
