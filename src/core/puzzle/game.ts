import { attackedCells, solutionCells } from './geometry';
import type { Puzzle } from './types';

export type CellMark = 'empty' | 'x' | 'autoX' | 'dog';
export type GameStatus = 'playing' | 'won' | 'lost';

export const START_BONES = 3;
export const MAX_BONES = 5;
export const MAX_POWERUPS_PER_LEVEL = 3;

export interface HintView {
  source: 'nudge' | 'flashlight' | 'mistake';
  cells: number[];
  units: { type: 'row' | 'col' | 'region'; index: number }[];
  text: string;
}

export interface GameEvent {
  id: number;
  type: 'dog' | 'wrong' | 'shielded' | 'powerUp';
  cells: number[];
}

export interface GameState {
  levelId: number;
  puzzle: Puzzle;
  marks: CellMark[];
  bones: number;
  shield: boolean;
  mistakes: number;
  lostBones: number;
  powerUpsUsed: number;
  history: CellMark[][];
  status: GameStatus;
  elapsedMs: number;
  freeNudgeUsed: boolean;
  hint: HintView | null;
  event: GameEvent | null;
}

export type GameAction =
  | { type: 'toggleX'; cell: number }
  | { type: 'paint'; cells: number[]; value: boolean; newStroke: boolean }
  | { type: 'placeDog'; cell: number; autoCross: boolean }
  | { type: 'undo' }
  | { type: 'tick'; ms: number }
  | { type: 'setHint'; hint: HintView | null }
  | { type: 'replace'; state: GameState }
  | { type: 'restart' };

export function createGame(levelId: number, puzzle: Puzzle): GameState {
  return {
    levelId,
    puzzle,
    marks: new Array(puzzle.size * puzzle.size).fill('empty'),
    bones: START_BONES,
    shield: false,
    mistakes: 0,
    lostBones: 0,
    powerUpsUsed: 0,
    history: [],
    status: 'playing',
    elapsedMs: 0,
    freeNudgeUsed: false,
    hint: null,
    event: null,
  };
}

let eventCounter = 0;
export const makeEvent = (type: GameEvent['type'], cells: number[]): GameEvent => ({ id: ++eventCounter, type, cells });

export const isCrossed = (m: CellMark) => m === 'x' || m === 'autoX';
export const dogCount = (s: GameState) => s.marks.filter((m) => m === 'dog').length;
export const isSolutionCell = (puzzle: Puzzle, cell: number) =>
  puzzle.solution[Math.floor(cell / puzzle.size)] === cell % puzzle.size;

/** Places a known-correct dog and optionally crosses everything it rules out. */
export function withCorrectDog(state: GameState, cell: number, autoCross: boolean): GameState {
  const marks = [...state.marks];
  marks[cell] = 'dog';
  if (autoCross) {
    for (const a of attackedCells(cell, state.puzzle)) if (marks[a] === 'empty') marks[a] = 'autoX';
  }
  const won = marks.filter((m) => m === 'dog').length === state.puzzle.size;
  return {
    ...state,
    marks,
    history: [],
    hint: null,
    status: won ? 'won' : state.status,
    event: makeEvent('dog', [cell]),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'replace') return action.state;
  if (action.type === 'restart') return createGame(state.levelId, state.puzzle);
  if (action.type === 'setHint') return { ...state, hint: action.hint };
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'tick':
      return { ...state, elapsedMs: state.elapsedMs + action.ms };
    case 'toggleX': {
      const m = state.marks[action.cell];
      if (m === 'dog') return state;
      const marks = [...state.marks];
      marks[action.cell] = isCrossed(m) ? 'empty' : 'x';
      return { ...state, marks, history: [...state.history, state.marks], hint: null };
    }
    case 'paint': {
      let changed = false;
      const marks = [...state.marks];
      for (const cell of action.cells) {
        const m = marks[cell];
        if (m === 'dog') continue;
        if (action.value && m === 'empty') {
          marks[cell] = 'x';
          changed = true;
        } else if (!action.value && isCrossed(m)) {
          marks[cell] = 'empty';
          changed = true;
        }
      }
      if (!changed) return state;
      const history = action.newStroke ? [...state.history, state.marks] : state.history;
      return { ...state, marks, history, hint: null };
    }
    case 'placeDog': {
      const { cell } = action;
      if (state.marks[cell] === 'dog') return state;
      if (isSolutionCell(state.puzzle, cell)) return withCorrectDog(state, cell, action.autoCross);
      const marks = [...state.marks];
      marks[cell] = 'autoX';
      if (state.shield) {
        return { ...state, marks, shield: false, hint: null, event: makeEvent('shielded', [cell]) };
      }
      const bones = state.bones - 1;
      return {
        ...state,
        marks,
        bones,
        mistakes: state.mistakes + 1,
        lostBones: state.lostBones + 1,
        hint: null,
        status: bones <= 0 ? 'lost' : 'playing',
        event: makeEvent('wrong', [cell]),
      };
    }
    case 'undo': {
      if (!state.history.length) return state;
      const history = state.history.slice(0, -1);
      return { ...state, marks: state.history[state.history.length - 1], history, hint: null };
    }
  }
}

export function computeStars(state: Pick<GameState, 'mistakes' | 'powerUpsUsed'>): 1 | 2 | 3 {
  if (state.mistakes === 0 && state.powerUpsUsed === 0) return 3;
  if (state.mistakes <= 1 && state.powerUpsUsed <= 1) return 2;
  return 1;
}

export function wrongCrosses(state: GameState): number[] {
  const sol = new Set(solutionCells(state.puzzle));
  return state.marks.map((m, i) => (isCrossed(m) && sol.has(i) ? i : -1)).filter((i) => i >= 0);
}
