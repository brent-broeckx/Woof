import { createRng } from '../../core/rng';

export type WaterColor = number;
export type Bowl = WaterColor[];

export interface WaterSortConfig {
  colors: number;
  capacity: 4;
  emptyBowls: 2;
  scrambleMoves: number;
}

export interface WaterSortPuzzle {
  capacity: 4;
  colors: number;
  bowls: Bowl[];
  target: number;
}

export interface WaterSortState {
  puzzle: WaterSortPuzzle;
  bowls: Bowl[];
  selected: number | null;
  pours: number;
  history: Bowl[][];
}

export function waterSortConfigForTier(tier: number): WaterSortConfig {
  const colors = tier <= 2 ? 3 : tier <= 5 ? 4 : tier <= 8 ? 5 : tier <= 12 ? 6 : tier <= 16 ? 7 : 8;
  return { colors, capacity: 4, emptyBowls: 2, scrambleMoves: Math.min(16, 6 + colors + Math.floor(tier / 4)) };
}

function cloneBowls(bowls: readonly Bowl[]): Bowl[] {
  return bowls.map((bowl) => [...bowl]);
}

function solvedBowls(colors: number, emptyBowls: number): Bowl[] {
  return [...Array.from({ length: colors }, (_, color) => [color, color, color, color]), ...Array.from({ length: emptyBowls }, () => [])];
}

export function canPour(bowls: readonly Bowl[], from: number, to: number, capacity = 4): boolean {
  if (from === to) return false;
  const source = bowls[from];
  const target = bowls[to];
  if (!source.length || target.length >= capacity) return false;
  const color = source[source.length - 1];
  return !target.length || target[target.length - 1] === color;
}

export function pourAmount(bowls: readonly Bowl[], from: number, to: number, capacity = 4): number {
  if (!canPour(bowls, from, to, capacity)) return 0;
  const source = bowls[from];
  const color = source[source.length - 1];
  let run = 0;
  for (let i = source.length - 1; i >= 0 && source[i] === color; i--) run++;
  return Math.min(run, capacity - bowls[to].length);
}

export function pourBowls(bowls: readonly Bowl[], from: number, to: number, capacity = 4): Bowl[] | null {
  const amount = pourAmount(bowls, from, to, capacity);
  if (!amount) return null;
  const next = cloneBowls(bowls);
  const moving = next[from].splice(next[from].length - amount, amount);
  next[to].push(...moving);
  return next;
}

export function isWaterSortSolved(bowls: readonly Bowl[], capacity = 4): boolean {
  return bowls.every((bowl) => bowl.length === 0 || (bowl.length === capacity && bowl.every((c) => c === bowl[0])));
}

function stateKey(bowls: readonly Bowl[]): string {
  const colorMap = new Map<number, number>();
  let nextColor = 0;
  const normalized = bowls.map((bowl) =>
    bowl
      .map((color) => {
        if (!colorMap.has(color)) colorMap.set(color, nextColor++);
        return colorMap.get(color)!;
      })
      .join(''),
  );
  normalized.sort();
  return normalized.join('|');
}

function meaningfulMoves(bowls: readonly Bowl[], capacity: number): [number, number][] {
  const moves: [number, number][] = [];
  for (let from = 0; from < bowls.length; from++) {
    for (let to = 0; to < bowls.length; to++) {
      if (!canPour(bowls, from, to, capacity)) continue;
      const source = bowls[from];
      const target = bowls[to];
      if (!target.length && source.every((c) => c === source[0])) continue;
      moves.push([from, to]);
    }
  }
  return moves;
}

export function solveWaterSort(start: readonly Bowl[], capacity = 4, nodeCap = 120_000): number[] | null {
  if (isWaterSortSolved(start, capacity)) return [];
  const queue: { bowls: Bowl[]; path: number[] }[] = [{ bowls: cloneBowls(start), path: [] }];
  const seen = new Set([stateKey(start)]);
  for (let head = 0; head < queue.length && head < nodeCap; head++) {
    const current = queue[head];
    for (const [from, to] of meaningfulMoves(current.bowls, capacity)) {
      const next = pourBowls(current.bowls, from, to, capacity)!;
      const key = stateKey(next);
      if (seen.has(key)) continue;
      const path = [...current.path, from * current.bowls.length + to];
      if (isWaterSortSolved(next, capacity)) return path;
      seen.add(key);
      queue.push({ bowls: next, path });
      if (queue.length > nodeCap) return null;
    }
  }
  return null;
}

function shuffledBowls(colors: number, emptyBowls: number, seed: number): Bowl[] {
  const rng = createRng(seed);
  const layers = Array.from({ length: colors }, (_, color) => [color, color, color, color]).flat();
  rng.shuffle(layers);
  const bowls = Array.from({ length: colors }, (_, i) => layers.slice(i * 4, i * 4 + 4));
  bowls.push(...Array.from({ length: emptyBowls }, () => []));
  return bowls;
}

function allValidMoves(bowls: readonly Bowl[], capacity: number): [number, number][] {
  const moves: [number, number][] = [];
  for (let from = 0; from < bowls.length; from++) {
    for (let to = 0; to < bowls.length; to++) if (canPour(bowls, from, to, capacity)) moves.push([from, to]);
  }
  return moves;
}

function scrambledSolvableBowls(config: WaterSortConfig, seed: number): Bowl[] {
  const rng = createRng(seed ^ 0x9e3779b9);
  let bowls = solvedBowls(config.colors, config.emptyBowls);
  let previous = '';
  for (let i = 0; i < config.scrambleMoves; i++) {
    const options = allValidMoves(bowls, config.capacity).filter(([from, to]) => `${to},${from}` !== previous);
    const moves = options.length ? options : allValidMoves(bowls, config.capacity);
    const [from, to] = rng.pick(moves);
    bowls = pourBowls(bowls, from, to, config.capacity)!;
    previous = `${from},${to}`;
  }
  return bowls;
}

function chainBowls(colors: number, emptyBowls: number, seed: number): Bowl[] {
  const rng = createRng(seed ^ 0x51f15e);
  const order = rng.shuffle(Array.from({ length: colors }, (_, color) => color));
  const bowls = order.map((color, index) => [color, color, color, order[(index + 1) % colors]]);
  bowls.push(...Array.from({ length: emptyBowls }, () => []));
  return bowls;
}

export function generateWaterSortPuzzle(config: WaterSortConfig, seed: number): WaterSortPuzzle {
  if (config.colors > 5) {
    const bowls = chainBowls(config.colors, config.emptyBowls, seed);
    const solution = solveWaterSort(bowls, config.capacity, 60_000);
    if (solution && solution.length > 0) return { capacity: config.capacity, colors: config.colors, bowls, target: solution.length };
  }
  const shuffleAttempts = config.colors <= 5 ? 8 : 2;
  for (let attempt = 0; attempt < shuffleAttempts; attempt++) {
    const bowls = shuffledBowls(config.colors, config.emptyBowls, seed + attempt * 101);
    const solution = solveWaterSort(bowls, config.capacity, config.colors <= 5 ? 80_000 : 20_000);
    if (solution && solution.length > 0) return { capacity: config.capacity, colors: config.colors, bowls, target: solution.length };
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const bowls = scrambledSolvableBowls(config, seed + attempt * 4099);
    const solution = solveWaterSort(bowls, config.capacity, 80_000);
    if (solution && solution.length > 0) return { capacity: config.capacity, colors: config.colors, bowls, target: solution.length };
  }
  const bowls = solvedBowls(config.colors, config.emptyBowls);
  return { capacity: config.capacity, colors: config.colors, bowls, target: 0 };
}

export function createWaterSortState(puzzle: WaterSortPuzzle): WaterSortState {
  return { puzzle, bowls: cloneBowls(puzzle.bowls), selected: null, pours: 0, history: [] };
}

export function selectOrPour(state: WaterSortState, bowl: number): WaterSortState {
  if (state.selected === null) return state.bowls[bowl].length ? { ...state, selected: bowl } : state;
  if (state.selected === bowl) return { ...state, selected: null };
  const next = pourBowls(state.bowls, state.selected, bowl, state.puzzle.capacity);
  if (!next) return state.bowls[bowl].length ? { ...state, selected: bowl } : { ...state, selected: null };
  return { ...state, bowls: next, selected: null, pours: state.pours + 1, history: [...state.history, cloneBowls(state.bowls)] };
}

export function undoWaterSort(state: WaterSortState): WaterSortState {
  const previous = state.history[state.history.length - 1];
  if (!previous) return state;
  return { ...state, bowls: cloneBowls(previous), selected: null, pours: Math.max(0, state.pours - 1), history: state.history.slice(0, -1) };
}

export function resetWaterSort(state: WaterSortState): WaterSortState {
  return createWaterSortState(state.puzzle);
}

export function waterSortStars(pours: number, target: number): 1 | 2 | 3 {
  if (pours <= target + 2) return 3;
  if (pours <= Math.floor(target * 1.6 + 3)) return 2;
  return 1;
}
