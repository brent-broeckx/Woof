import { createRng, hashSeed, type Rng } from '../../core/rng';

export type RushDir = 'h' | 'v';

export interface RushVehicle {
  id: number;
  row: number;
  col: number;
  length: 2 | 3;
  dir: RushDir;
  color: number;
}

export interface RushConfig {
  size: 6;
  minMoves: number;
  maxMoves: number;
  vehicles: number;
  scrambleMoves: number;
}

export interface RushPuzzle {
  size: 6;
  vehicles: RushVehicle[];
  start: number[];
  optimal: number;
  relaxed: boolean;
}

export interface RushState {
  puzzle: RushPuzzle;
  positions: number[];
  moves: number;
  history: number[][];
}

interface Candidate {
  vehicles: RushVehicle[];
  solved: number[];
}

const SIZE = 6;
const DOG_ROW = 2;
const DOG_EXIT = 4;

export function rushHourConfigForTier(tier: number): RushConfig {
  if (tier <= 3) return { size: SIZE, minMoves: 4, maxMoves: 7, vehicles: 8, scrambleMoves: 16 + tier * 2 };
  if (tier <= 10) return { size: SIZE, minMoves: 7, maxMoves: 12, vehicles: 9 + Math.floor(tier / 5), scrambleMoves: 24 + tier };
  return { size: SIZE, minMoves: 10, maxMoves: 18, vehicles: 11, scrambleMoves: 34 + tier };
}

export const rushStateKey = (positions: readonly number[]) => positions.join(',');

function vehicleCells(vehicle: RushVehicle, pos: number): number[] {
  const row = vehicle.dir === 'h' ? vehicle.row : pos;
  const col = vehicle.dir === 'h' ? pos : vehicle.col;
  return Array.from({ length: vehicle.length }, (_, i) => (row + (vehicle.dir === 'v' ? i : 0)) * SIZE + col + (vehicle.dir === 'h' ? i : 0));
}

export function rushOccupancy(puzzle: RushPuzzle, positions = puzzle.start): number[] {
  const occ = new Array(SIZE * SIZE).fill(-1);
  puzzle.vehicles.forEach((vehicle, i) => {
    for (const cell of vehicleCells(vehicle, positions[i])) occ[cell] = i;
  });
  return occ;
}

function isGoal(puzzle: Pick<RushPuzzle, 'vehicles'>, positions: readonly number[]): boolean {
  return positions[0] === DOG_EXIT && puzzle.vehicles[0].row === DOG_ROW;
}

export function isRushSolved(puzzle: RushPuzzle, positions: readonly number[]): boolean {
  return isGoal(puzzle, positions);
}

export interface RushMove {
  vehicle: number;
  to: number;
}

export function rushLegalMoves(puzzle: Pick<RushPuzzle, 'vehicles'>, positions: readonly number[]): RushMove[] {
  const occ = new Array(SIZE * SIZE).fill(-1);
  puzzle.vehicles.forEach((vehicle, i) => {
    for (const cell of vehicleCells(vehicle, positions[i])) occ[cell] = i;
  });
  const moves: RushMove[] = [];
  puzzle.vehicles.forEach((vehicle, i) => {
    const pos = positions[i];
    const min = 0;
    const max = SIZE - vehicle.length;
    for (let to = pos - 1; to >= min; to--) {
      const cell = vehicle.dir === 'h' ? vehicle.row * SIZE + to : to * SIZE + vehicle.col;
      if (occ[cell] !== -1 && occ[cell] !== i) break;
      moves.push({ vehicle: i, to });
    }
    for (let to = pos + 1; to <= max; to++) {
      const cell = vehicle.dir === 'h' ? vehicle.row * SIZE + to + vehicle.length - 1 : (to + vehicle.length - 1) * SIZE + vehicle.col;
      if (occ[cell] !== -1 && occ[cell] !== i) break;
      moves.push({ vehicle: i, to });
    }
  });
  return moves;
}

export function moveRushVehicle(puzzle: RushPuzzle, positions: readonly number[], vehicle: number, to: number): number[] | null {
  if (!rushLegalMoves(puzzle, positions).some((m) => m.vehicle === vehicle && m.to === to)) return null;
  const next = [...positions];
  next[vehicle] = to;
  return next;
}

export function createRushState(puzzle: RushPuzzle): RushState {
  return { puzzle, positions: [...puzzle.start], moves: 0, history: [] };
}

export function applyRushMove(state: RushState, vehicle: number, to: number): RushState {
  const next = moveRushVehicle(state.puzzle, state.positions, vehicle, to);
  if (!next) return state;
  return { ...state, positions: next, moves: state.moves + 1, history: [...state.history, state.positions] };
}

export function undoRush(state: RushState): RushState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { ...state, positions: previous, moves: Math.max(0, state.moves - 1), history: state.history.slice(0, -1) };
}

export function resetRush(state: RushState): RushState {
  return { ...state, positions: [...state.puzzle.start], moves: 0, history: [] };
}

export function solveRush(puzzle: Pick<RushPuzzle, 'vehicles' | 'start'>, maxStates = 80_000): number | null {
  if (isGoal(puzzle, puzzle.start)) return 0;
  const queue: { positions: number[]; depth: number }[] = [{ positions: [...puzzle.start], depth: 0 }];
  const seen = new Set([rushStateKey(puzzle.start)]);
  for (let head = 0; head < queue.length; head++) {
    if (seen.size > maxStates) return null;
    const item = queue[head];
    for (const move of rushLegalMoves(puzzle, item.positions)) {
      const positions = [...item.positions];
      positions[move.vehicle] = move.to;
      const key = rushStateKey(positions);
      if (seen.has(key)) continue;
      if (isGoal(puzzle, positions)) return item.depth + 1;
      seen.add(key);
      queue.push({ positions, depth: item.depth + 1 });
    }
  }
  return null;
}

function canPlace(vehicles: RushVehicle[], positions: number[], vehicle: RushVehicle, pos: number): boolean {
  const used = new Set<number>();
  vehicles.forEach((v, i) => {
    for (const cell of vehicleCells(v, positions[i])) used.add(cell);
  });
  return vehicleCells(vehicle, pos).every((cell) => !used.has(cell));
}

function randomCandidate(rng: Rng, config: RushConfig, salt: number): Candidate | null {
  const vehicles: RushVehicle[] = [{ id: 0, row: DOG_ROW, col: 0, length: 2, dir: 'h', color: 0 }];
  const solved = [DOG_EXIT];
  const specs = Array.from({ length: config.vehicles - 1 }, (_, i) => ({
    id: i + 1,
    length: (rng.next() < 0.25 ? 3 : 2) as 2 | 3,
    dir: (rng.next() < 0.5 ? 'h' : 'v') as RushDir,
    color: (i + salt) % 11,
  }));
  specs.sort((a, b) => (b.length === a.length ? 0 : b.length - a.length));
  for (const spec of specs) {
    let placed = false;
    for (let tries = 0; tries < 80 && !placed; tries++) {
      const maxPos = SIZE - spec.length;
      const row = spec.dir === 'h' ? rng.int(SIZE) : 0;
      const col = spec.dir === 'v' ? rng.int(SIZE) : 0;
      const pos = rng.range(0, maxPos);
      const vehicle: RushVehicle = { ...spec, row, col, color: spec.color };
      if (vehicle.dir === 'h') vehicle.row = row;
      else vehicle.col = col;
      if (vehicle.dir === 'h' && vehicle.row === DOG_ROW) continue;
      if (vehicle.dir === 'v' && vehicle.col >= DOG_EXIT) continue;
      if (!canPlace(vehicles, solved, vehicle, pos)) continue;
      vehicles.push(vehicle);
      solved.push(pos);
      placed = true;
    }
    if (!placed) return null;
  }
  return { vehicles, solved };
}

function scrambleCandidate(candidate: Candidate, rng: Rng, steps: number): number[] {
  let positions = [...candidate.solved];
  const dogStarts = rushLegalMoves({ vehicles: candidate.vehicles }, positions).filter((m) => m.vehicle === 0 && m.to <= 2);
  if (!dogStarts.length) return positions;
  positions[0] = rng.pick(dogStarts).to;
  let previous = -1;
  for (let i = 0; i < steps; i++) {
    const moves = rushLegalMoves({ vehicles: candidate.vehicles }, positions).filter((m) => m.vehicle !== previous || rng.next() < 0.25);
    if (!moves.length) break;
    const move = rng.pick(moves);
    positions = [...positions];
    positions[move.vehicle] = move.to;
    previous = move.vehicle;
  }
  if (positions[0] > 2) {
    const leftMoves = rushLegalMoves({ vehicles: candidate.vehicles }, positions).filter((m) => m.vehicle === 0 && m.to <= 2);
    if (leftMoves.length) positions[0] = rng.pick(leftMoves).to;
  }
  return positions;
}

export function generateRushHourPuzzle(config: RushConfig, seed: number): RushPuzzle {
  const rng = createRng(hashSeed('rushHour', seed));
  let relaxedBest: RushPuzzle | null = null;
  for (let attempt = 0; attempt < 90; attempt++) {
    const candidate = randomCandidate(rng, config, attempt);
    if (!candidate) continue;
    const start = scrambleCandidate(candidate, rng, config.scrambleMoves + attempt);
    const optimal = solveRush({ vehicles: candidate.vehicles, start });
    if (optimal === null || optimal < 3) continue;
    const puzzle: RushPuzzle = { size: SIZE, vehicles: candidate.vehicles, start, optimal, relaxed: false };
    if (optimal >= config.minMoves && optimal <= config.maxMoves) return puzzle;
    if (!relaxedBest || Math.abs(optimal - config.minMoves) < Math.abs(relaxedBest.optimal - config.minMoves)) {
      relaxedBest = { ...puzzle, relaxed: true };
    }
  }
  if (relaxedBest) return relaxedBest;
  const fallback = fallbackRushPuzzle(seed);
  const optimal = solveRush(fallback) ?? 4;
  return { ...fallback, optimal, relaxed: true };
}

function fallbackRushPuzzle(seed: number): Pick<RushPuzzle, 'vehicles' | 'start' | 'size'> {
  const shift = seed % 2;
  const vehicles: RushVehicle[] = [
    { id: 0, row: 2, col: 0, length: 2, dir: 'h', color: 0 },
    { id: 1, row: 0, col: 2, length: 3, dir: 'v', color: 1 },
    { id: 2, row: 0, col: 3, length: 2, dir: 'v', color: 2 },
    { id: 3, row: 3, col: 0, length: 3, dir: 'h', color: 3 },
    { id: 4, row: 4, col: 1, length: 2, dir: 'h', color: 4 },
    { id: 5, row: 1, col: 5, length: 3, dir: 'v', color: 5 },
    { id: 6, row: 5, col: 3, length: 3, dir: 'h', color: 6 },
    { id: 7, row: 0, col: 0, length: 2, dir: 'v', color: 7 },
  ];
  return { size: SIZE, vehicles, start: [0, 1, shift, 1, 2, 1, 3, 0] };
}

export function rushHourStars(moves: number, optimal: number): 1 | 2 | 3 {
  if (moves <= optimal + 1) return 3;
  if (moves <= Math.ceil(optimal * 1.6 + 2)) return 2;
  return 1;
}
