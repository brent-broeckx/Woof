import { createRng } from '../../core/rng';

export interface LightsConfig {
  size: number;
  scramblePresses: number;
}
export interface LightsPuzzle {
  size: number;
  initial: boolean[];
  optimal: number;
  solution: boolean[];
  seed: number;
}
export interface LightsState {
  puzzle: LightsPuzzle;
  lamps: boolean[];
  moves: number;
  history: boolean[][];
  won: boolean;
}

export function lightsOutConfigForTier(tier: number): LightsConfig {
  const size = tier < 7 ? 3 : tier < 14 ? 4 : 5;
  return { size, scramblePresses: size + Math.floor(tier * 0.8) };
}

function toggleMask(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out = [cell];
  if (r > 0) out.push(cell - size);
  if (r + 1 < size) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c + 1 < size) out.push(cell + 1);
  return out;
}

export function pressLampOnBoard(lamps: readonly boolean[], size: number, cell: number): boolean[] {
  const next = [...lamps];
  for (const i of toggleMask(size, cell)) next[i] = !next[i];
  return next;
}

export function generateLightsOutPuzzle(config: LightsConfig, seed: number): LightsPuzzle {
  const rng = createRng(seed);
  let lamps = new Array(config.size * config.size).fill(false) as boolean[];
  for (let i = 0; i < config.scramblePresses; i++) lamps = pressLampOnBoard(lamps, config.size, rng.int(lamps.length));
  if (!lamps.some(Boolean)) lamps = pressLampOnBoard(lamps, config.size, rng.int(lamps.length));
  const solution = solveLightsOut(config.size, lamps);
  return { size: config.size, initial: lamps, optimal: solution.filter(Boolean).length, solution, seed };
}

export function createLightsOutState(puzzle: LightsPuzzle): LightsState {
  return { puzzle, lamps: [...puzzle.initial], moves: 0, history: [], won: !puzzle.initial.some(Boolean) };
}

export function pressLamp(state: LightsState, cell: number): LightsState {
  if (state.won) return state;
  const lamps = pressLampOnBoard(state.lamps, state.puzzle.size, cell);
  return { ...state, lamps, moves: state.moves + 1, history: [...state.history, state.lamps], won: !lamps.some(Boolean) };
}

export function undoLamp(state: LightsState): LightsState {
  const previous = state.history[state.history.length - 1];
  if (!previous) return state;
  return { ...state, lamps: previous, moves: Math.max(0, state.moves - 1), history: state.history.slice(0, -1), won: !previous.some(Boolean) };
}

export function resetLamps(state: LightsState): LightsState {
  return createLightsOutState(state.puzzle);
}

export function lightsOutStars(state: LightsState): 0 | 1 | 2 | 3 {
  if (!state.won) return state.moves > 0 ? 1 : 0;
  const optimal = state.puzzle.optimal;
  if (state.moves <= optimal + 2) return 3;
  if (state.moves <= optimal * 2 + 2) return 2;
  return 1;
}

export function solveLightsOut(size: number, target: readonly boolean[]): boolean[] {
  const n = size * size;
  const rows: number[][] = [];
  for (let r = 0; r < n; r++) {
    const row = new Array(n + 1).fill(0) as number[];
    for (const c of toggleMask(size, r)) row[c] = 1;
    row[n] = target[r] ? 1 : 0;
    rows.push(row);
  }
  const pivots: number[] = [];
  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < n; col++) {
    let found = -1;
    for (let r = pivotRow; r < n; r++)
      if (rows[r][col]) {
        found = r;
        break;
      }
    if (found < 0) continue;
    [rows[pivotRow], rows[found]] = [rows[found], rows[pivotRow]];
    for (let r = 0; r < n; r++) if (r !== pivotRow && rows[r][col]) for (let c = col; c <= n; c++) rows[r][c] ^= rows[pivotRow][c];
    pivots[pivotRow] = col;
    pivotRow++;
  }
  for (let r = pivotRow; r < n; r++) if (rows[r][n]) throw new Error('Unsolvable lights out board');
  const pivotSet = new Set(pivots);
  const freeCols = Array.from({ length: n }, (_, i) => i).filter((i) => !pivotSet.has(i));
  const base = new Array(n).fill(false) as boolean[];
  for (let r = 0; r < pivotRow; r++) base[pivots[r]] = !!rows[r][n];
  const basis = freeCols.map((free) => {
    const v = new Array(n).fill(false) as boolean[];
    v[free] = true;
    for (let r = 0; r < pivotRow; r++) if (rows[r][free]) v[pivots[r]] = true;
    return v;
  });
  let best = base;
  let bestWeight = weight(base);
  const combos = 1 << basis.length;
  for (let mask = 1; mask < combos; mask++) {
    const candidate = [...base];
    for (let b = 0; b < basis.length; b++) if (mask & (1 << b)) for (let i = 0; i < n; i++) candidate[i] = candidate[i] !== basis[b][i];
    const w = weight(candidate);
    if (w < bestWeight) {
      best = candidate;
      bestWeight = w;
    }
  }
  return best;
}

function weight(v: readonly boolean[]): number {
  return v.reduce((sum, bit) => sum + (bit ? 1 : 0), 0);
}
