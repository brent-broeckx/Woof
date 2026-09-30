import { createRng, hashSeed } from '../../core/rng';

export const PIPE_N = 1;
export const PIPE_E = 2;
export const PIPE_S = 4;
export const PIPE_W = 8;

export type PipeMask = number;

export interface PipeConfig {
  size: number;
}

export interface PipePuzzle {
  size: number;
  source: number;
  solution: PipeMask[];
  start: PipeMask[];
  bowls: number[];
  target: number;
}

export interface PipeState {
  puzzle: PipePuzzle;
  masks: PipeMask[];
  moves: number;
  history: PipeMask[][];
}

const DIRS = [
  { bit: PIPE_N, opposite: PIPE_S, dr: -1, dc: 0 },
  { bit: PIPE_E, opposite: PIPE_W, dr: 0, dc: 1 },
  { bit: PIPE_S, opposite: PIPE_N, dr: 1, dc: 0 },
  { bit: PIPE_W, opposite: PIPE_E, dr: 0, dc: -1 },
];

export function pipeSprinklersConfigForTier(tier: number): PipeConfig {
  return { size: Math.min(7, 4 + Math.floor((tier - 1) / 5)) };
}

export function rotateMask(mask: PipeMask, turns = 1): PipeMask {
  let next = mask;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) {
    next = (next & PIPE_N ? PIPE_E : 0) | (next & PIPE_E ? PIPE_S : 0) | (next & PIPE_S ? PIPE_W : 0) | (next & PIPE_W ? PIPE_N : 0);
  }
  return next;
}

function minimalTurns(from: PipeMask, to: PipeMask): number {
  let best = 4;
  for (let t = 0; t < 4; t++) {
    if (rotateMask(from, t) === to) best = Math.min(best, t, (4 - t) % 4);
  }
  return best === 4 ? 0 : best;
}

function neighbor(cell: number, size: number, bit: number): number | null {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const dir = DIRS.find((d) => d.bit === bit);
  if (!dir) return null;
  const nr = r + dir.dr;
  const nc = c + dir.dc;
  return nr < 0 || nc < 0 || nr >= size || nc >= size ? null : nr * size + nc;
}

export function pipeFlow(size: number, source: number, masks: readonly PipeMask[]): { watered: Set<number>; leaks: Set<number> } {
  const watered = new Set<number>();
  const leaks = new Set<number>();
  const queue = [source];
  watered.add(source);
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const dir of DIRS) {
      if ((masks[cell] & dir.bit) === 0) continue;
      const n = neighbor(cell, size, dir.bit);
      if (n === null || (masks[n] & dir.opposite) === 0) {
        leaks.add(cell);
        continue;
      }
      if (!watered.has(n)) {
        watered.add(n);
        queue.push(n);
      }
    }
  }
  return { watered, leaks };
}

export function isPipeSolved(puzzle: PipePuzzle, masks: readonly PipeMask[]): boolean {
  const { watered, leaks } = pipeFlow(puzzle.size, puzzle.source, masks);
  if (watered.size !== puzzle.size * puzzle.size || leaks.size > 0) return false;
  for (let cell = 0; cell < masks.length; cell++) {
    for (const dir of DIRS) {
      if ((masks[cell] & dir.bit) === 0) continue;
      const n = neighbor(cell, puzzle.size, dir.bit);
      if (n === null || (masks[n] & dir.opposite) === 0) return false;
    }
  }
  return true;
}

export function generatePipeSprinklersPuzzle(config: PipeConfig, seed: number): PipePuzzle {
  const rng = createRng(hashSeed('pipeSprinklers', seed));
  const size = config.size;
  const total = size * size;
  const source = Math.floor(size / 2) * size + Math.floor(size / 2);
  const solution = new Array<PipeMask>(total).fill(0);
  const visited = new Set([source]);
  const frontier = [source];
  while (visited.size < total) {
    const from = rng.pick(frontier);
    const options = DIRS.map((dir) => ({ dir, to: neighbor(from, size, dir.bit) })).filter(
      (x): x is { dir: (typeof DIRS)[number]; to: number } => x.to !== null && !visited.has(x.to),
    );
    if (!options.length) {
      frontier.splice(frontier.indexOf(from), 1);
      continue;
    }
    const { dir, to } = rng.pick(options);
    solution[from] |= dir.bit;
    solution[to] |= dir.opposite;
    visited.add(to);
    frontier.push(to);
  }
  const leaves = solution
    .map((mask, i) => ({ i, degree: DIRS.filter((dir) => (mask & dir.bit) !== 0).length }))
    .filter((x) => x.degree === 1 && x.i !== source);
  const bowls = leaves.map((x) => x.i);
  if (bowls.length < 2) {
    const extras = solution.map((_, i) => i).filter((i) => i !== source && !bowls.includes(i));
    bowls.push(...rng.shuffle(extras).slice(0, 2 - bowls.length));
  }
  let start = solution.map((mask) => rotateMask(mask, rng.int(4)));
  if (isPipeSolved({ size, source, solution, start, bowls, target: 0 }, start)) {
    start = start.map((mask, i) => (i === source ? rotateMask(mask, 1) : mask));
  }
  const target = start.reduce((sum, mask, i) => sum + minimalTurns(mask, solution[i]), 0);
  return { size, source, solution, start, bowls, target };
}

export function createPipeState(puzzle: PipePuzzle): PipeState {
  return { puzzle, masks: [...puzzle.start], moves: 0, history: [] };
}

export function rotatePipeTile(state: PipeState, index: number, direction: 1 | -1 = 1): PipeState {
  const masks = [...state.masks];
  masks[index] = rotateMask(masks[index], direction);
  return { ...state, masks, moves: state.moves + 1, history: [...state.history, state.masks] };
}

export function undoPipe(state: PipeState): PipeState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { ...state, masks: previous, moves: Math.max(0, state.moves - 1), history: state.history.slice(0, -1) };
}

export function resetPipe(state: PipeState): PipeState {
  return { ...state, masks: [...state.puzzle.start], moves: 0, history: [] };
}

export function pipeSprinklersStars(moves: number, target: number): 1 | 2 | 3 {
  if (moves <= target + 2) return 3;
  if (moves <= Math.ceil(target * 1.5 + 4)) return 2;
  return 1;
}
