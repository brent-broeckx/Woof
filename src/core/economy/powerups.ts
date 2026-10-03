import { rowOf } from '../puzzle/geometry';
import { MAX_BONES, MAX_POWERUPS_PER_LEVEL, isSolutionCell, makeEvent, withCorrectDog, type GameState } from '../puzzle/game';
import { findHint } from '../puzzle/hints';
import { applyDeduction, createLogicState, findNextDeduction } from '../puzzle/logicSolver';
import { createRng, hashSeed } from '../rng';

export type PowerUpId = 'sniff' | 'extraBone' | 'fetch' | 'flashlight' | 'guideDog';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  icon: string;
  rarity: Rarity;
  price: number;
  description: string;
  /** Power-ups that need the player to tap a tile after activating. */
  target: 'cell' | null;
  targetPrompt?: string;
}

export const POWER_UPS: Record<PowerUpId, PowerUpDef> = {
  sniff: {
    id: 'sniff',
    name: 'Sniff',
    icon: '👃',
    rarity: 'rare',
    price: 200,
    target: 'cell',
    targetPrompt: 'Tap a yard to sniff out its dog',
    description: 'Tap a yard: its dog is found and placed.',
  },
  extraBone: {
    id: 'extraBone',
    name: 'Extra Bone',
    icon: '🦴',
    rarity: 'common',
    price: 60,
    target: null,
    description: `+1 bone (max ${MAX_BONES}). Also lets you continue after running out.`,
  },
  fetch: {
    id: 'fetch',
    name: 'Fetch',
    icon: '🎾',
    rarity: 'common',
    price: 60,
    target: 'cell',
    targetPrompt: 'Tap a row to throw the ball along it',
    description: 'Tap a row: crosses every wrong tile in it except one decoy.',
  },
  flashlight: {
    id: 'flashlight',
    name: 'Flashlight',
    icon: '🔦',
    rarity: 'uncommon',
    price: 120,
    target: null,
    description: 'Shows the exact next logical step and explains it.',
  },
  guideDog: {
    id: 'guideDog',
    name: 'Guide Dog',
    icon: '🦮',
    rarity: 'epic',
    price: 400,
    target: null,
    description: 'Places up to 3 new dogs for you.',
  },
};

export const POWER_UP_IDS = Object.keys(POWER_UPS) as PowerUpId[];

export type PowerUpResult = { ok: true; state: GameState; message?: string } | { ok: false; message: string };

function spend(state: GameState, cells: number[] = []): GameState {
  return { ...state, powerUpsUsed: state.powerUpsUsed + 1, event: makeEvent('powerUp', cells), hint: null };
}

export function canUseMorePowerUps(state: GameState): boolean {
  return state.powerUpsUsed < MAX_POWERUPS_PER_LEVEL;
}

export function applyPowerUp(state: GameState, id: PowerUpId, opts: { target?: number; autoCross: boolean }): PowerUpResult {
  if (!canUseMorePowerUps(state)) return { ok: false, message: `Max ${MAX_POWERUPS_PER_LEVEL} power-ups per level.` };
  const { puzzle } = state;
  const { size } = puzzle;
  if (state.status === 'won') return { ok: false, message: 'Level already solved!' };
  if (state.status === 'lost' && id !== 'extraBone') {
    return { ok: false, message: 'Out of bones — use an Extra Bone.' };
  }

  switch (id) {
    case 'extraBone':
      if (state.bones >= MAX_BONES) return { ok: false, message: `You already have ${MAX_BONES} bones.` };
      return { ok: true, state: { ...spend(state), bones: state.bones + 1, status: 'playing' } };

    case 'sniff': {
      if (opts.target === undefined) return { ok: false, message: 'Pick a yard.' };
      const region = puzzle.regions[opts.target];
      const cell = puzzle.solution.map((col, row) => row * size + col).find((c) => puzzle.regions[c] === region)!;
      if (state.marks[cell] === 'dog') return { ok: false, message: 'That yard already has its dog.' };
      return { ok: true, state: withCorrectDog(spend(state, [cell]), cell, opts.autoCross) };
    }

    case 'fetch': {
      if (opts.target === undefined) return { ok: false, message: 'Pick a row.' };
      const row = rowOf(opts.target, size);
      const rowCells = Array.from({ length: size }, (_, c) => row * size + c);
      if (rowCells.some((c) => state.marks[c] === 'dog')) return { ok: false, message: 'That row already has its dog.' };
      const wrong = rowCells.filter((c) => state.marks[c] === 'empty' && !isSolutionCell(puzzle, c));
      if (!wrong.length) return { ok: false, message: 'Nothing left to fetch in that row.' };
      const rng = createRng(hashSeed(state.levelId, row, state.elapsedMs));
      const decoy = wrong.length > 1 ? rng.pick(wrong) : -1;
      const marks = [...state.marks];
      const crossed = wrong.filter((c) => c !== decoy);
      if (!crossed.length) return { ok: false, message: 'Only one tile left to check — you can do it!' };
      for (const c of crossed) marks[c] = 'autoX';
      return { ok: true, state: { ...spend(state, crossed), marks, history: [] } };
    }

    case 'flashlight': {
      const hint = findHint(puzzle, state.marks);
      if (!hint) return { ok: false, message: 'No hint available.' };
      const next = spend(state);
      if (hint.kind === 'mistake') {
        return { ok: true, state: { ...next, hint: { source: 'mistake', cells: hint.cells, units: [], text: 'These crosses hide a dog! Remove them.' } } };
      }
      const d = hint.deduction;
      const prefix = d.kind === 'place' ? '🐶 Dog here! ' : '✖ Cross these. ';
      return { ok: true, state: { ...next, hint: { source: 'flashlight', cells: d.cells, units: d.focus, text: prefix + d.reason } } };
    }

    case 'guideDog': {
      const remaining = size - state.marks.filter((m) => m === 'dog').length;
      if (remaining <= 0) return { ok: false, message: 'Every dog is already placed.' };
      const target = Math.min(3, remaining);
      const picks: number[] = [];
      // Prefer the cells a player would logically find next, then fall back to any unplaced dog.
      const dogs = state.marks.map((m, i) => (m === 'dog' ? i : -1)).filter((i) => i >= 0);
      const logic = createLogicState(puzzle, dogs);
      for (let guard = 0; guard < 500 && picks.length < target; guard++) {
        const d = findNextDeduction(logic);
        if (!d) break;
        applyDeduction(logic, d);
        if (d.kind !== 'place') continue;
        for (const c of d.cells) {
          if (picks.length < target && state.marks[c] !== 'dog' && !picks.includes(c) && isSolutionCell(puzzle, c)) picks.push(c);
        }
      }
      for (let row = 0; row < size && picks.length < target; row++) {
        const c = row * size + puzzle.solution[row];
        if (state.marks[c] !== 'dog' && !picks.includes(c)) picks.push(c);
      }
      let next = spend(state, picks);
      for (const c of picks) next = withCorrectDog(next, c, opts.autoCross);
      next = { ...next, event: makeEvent('powerUp', picks) };
      return { ok: true, state: next, message: `Guide Dog placed ${picks.length} new dog${picks.length > 1 ? 's' : ''}.` };
    }
  }
}
