import { orthogonal } from '../../core/puzzle/geometry';
import { createRng, type Rng } from '../../core/rng';

/** Connect the Leashes — a Flow Free-style path puzzle. */

export interface LeashPuzzle {
  size: number;
  /** endpoints[color] = [cellA, cellB] */
  endpoints: [number, number][];
}

export interface LeashState {
  puzzle: LeashPuzzle;
  /** paths[color] always starts at one of that color's endpoints (or is empty). */
  paths: number[][];
  active: number | null;
  moves: number;
}

export function leashConfigForTier(tier: number) {
  const size = Math.min(8, 5 + Math.floor((tier - 1) / 2));
  return { size, pairs: size };
}

/** Random Hamiltonian path via the backbite algorithm. */
export function hamiltonianPath(size: number, rng: Rng): number[] {
  let path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) path.push(r * size + (r % 2 === 0 ? i : size - 1 - i));
  }
  const iterations = size * size * 30;
  for (let it = 0; it < iterations; it++) {
    if (rng.next() < 0.5) path.reverse();
    const end = path[0];
    const options = orthogonal(end, size).filter((n) => n !== path[1]);
    const n = rng.pick(options);
    const i = path.indexOf(n);
    path = [...path.slice(0, i).reverse(), ...path.slice(i)];
  }
  return path;
}

export function generateLeashPuzzle(size: number, pairs: number, seed: number): LeashPuzzle {
  const rng = createRng(seed);
  const path = hamiltonianPath(size, rng);
  const lengths = new Array(pairs).fill(3);
  for (let extra = size * size - pairs * 3; extra > 0; extra--) lengths[rng.int(pairs)]++;
  const endpoints: [number, number][] = [];
  let pos = 0;
  for (const len of lengths) {
    endpoints.push([path[pos], path[pos + len - 1]]);
    pos += len;
  }
  return { size, endpoints };
}

export function createLeashState(puzzle: LeashPuzzle): LeashState {
  return { puzzle, paths: puzzle.endpoints.map(() => []), active: null, moves: 0 };
}

export function endpointColor(puzzle: LeashPuzzle, cell: number): number {
  return puzzle.endpoints.findIndex(([a, b]) => a === cell || b === cell);
}

export function isComplete(state: LeashState, color: number): boolean {
  const path = state.paths[color];
  if (path.length < 2) return false;
  const [a, b] = state.puzzle.endpoints[color];
  const last = path[path.length - 1];
  return (last === a || last === b) && last !== path[0];
}

export function pathColorAt(state: LeashState, cell: number): number {
  return state.paths.findIndex((p) => p.includes(cell));
}

export function pointerDown(state: LeashState, cell: number): LeashState {
  const epColor = endpointColor(state.puzzle, cell);
  const paths = state.paths.map((p) => [...p]);
  if (epColor >= 0) {
    paths[epColor] = [cell];
    return { ...state, paths, active: epColor, moves: state.moves + 1 };
  }
  const color = pathColorAt(state, cell);
  if (color >= 0) {
    paths[color] = paths[color].slice(0, paths[color].indexOf(cell) + 1);
    return { ...state, paths, active: color, moves: state.moves + 1 };
  }
  return state;
}

export function pointerEnter(state: LeashState, cell: number): LeashState {
  const k = state.active;
  if (k === null) return state;
  const path = state.paths[k];
  const last = path[path.length - 1];
  if (cell === last) return state;
  const paths = state.paths.map((p) => [...p]);
  const idx = path.indexOf(cell);
  if (idx >= 0) {
    paths[k] = path.slice(0, idx + 1);
    return { ...state, paths };
  }
  if (!orthogonal(last, state.puzzle.size).includes(cell)) return state;
  if (isComplete(state, k)) return state;
  const ep = endpointColor(state.puzzle, cell);
  if (ep >= 0 && ep !== k) return state;
  const other = pathColorAt(state, cell);
  if (other >= 0 && other !== k) paths[other] = paths[other].slice(0, paths[other].indexOf(cell));
  paths[k] = [...path, cell];
  return { ...state, paths };
}

export function pointerUp(state: LeashState): LeashState {
  return state.active === null ? state : { ...state, active: null };
}

export function allConnected(state: LeashState): boolean {
  return state.puzzle.endpoints.every((_, k) => isComplete(state, k));
}

export function isFilled(state: LeashState): boolean {
  const covered = new Set<number>(state.paths.flat());
  for (const [a, b] of state.puzzle.endpoints) {
    covered.add(a);
    covered.add(b);
  }
  return covered.size === state.puzzle.size * state.puzzle.size;
}

export function leashStars(state: LeashState): 0 | 1 | 2 | 3 {
  if (!allConnected(state)) return 0;
  if (!isFilled(state)) return 1;
  return state.moves <= state.puzzle.endpoints.length + 3 ? 3 : 2;
}
