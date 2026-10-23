import { hashSeed } from '../rng';

/**
 * 🐈 Cat Café — a twist side path. Some cells hold a sleeping cat: no dog may go there.
 * Levels are generated on demand from a fixed seed, so everyone gets the same café.
 */
export const CAFE_LEVELS = 30;

export interface CafeConfig {
  level: number;
  size: number;
  cats: number;
  maxDifficulty: number;
  seed: number;
}

export function cafeConfig(level: number): CafeConfig {
  const i = Math.max(1, Math.min(CAFE_LEVELS, Math.floor(level))) - 1;
  const size = 6 + Math.min(3, Math.floor(i / 8));
  return {
    level: i + 1,
    size,
    cats: 2 + Math.floor(i / 5) + (size - 6),
    maxDifficulty: Math.min(5, 3 + Math.floor(i / 10)),
    seed: hashSeed('cafe', String(i + 1)),
  };
}

export const CAFE_FIRST_CLEAR_KIBBLE = 15;
export const CAFE_PERFECT_KIBBLE = 10;
export const cafeTreats = (level: number) => 40 + level * 5;

export interface CafeState {
  /** Café level -> best stars. Levels are played in order. */
  stars: Record<number, number>;
}

export const emptyCafe = (): CafeState => ({ stars: {} });

export const cafeCleared = (state: CafeState) => Object.keys(state.stars).length;
export const cafePerfect = (state: CafeState) => Object.values(state.stars).filter((s) => s >= 3).length;

/** The next café level to play (levels unlock one after another). */
export function cafeNext(state: CafeState): number {
  let n = 1;
  while (state.stars[n] && n < CAFE_LEVELS) n++;
  return n;
}

export interface CafeResult {
  state: CafeState;
  firstClear: boolean;
  firstPerfect: boolean;
  kibble: number;
  treats: number;
}

export function applyCafeCompletion(state: CafeState, level: number, stars: number): CafeResult {
  const s = Math.max(1, Math.min(3, Math.floor(stars)));
  const prev = state.stars[level] ?? 0;
  const firstClear = prev === 0;
  const firstPerfect = s === 3 && prev < 3;
  return {
    state: s > prev ? { stars: { ...state.stars, [level]: s } } : state,
    firstClear,
    firstPerfect,
    kibble: (firstClear ? CAFE_FIRST_CLEAR_KIBBLE : 0) + (firstPerfect ? CAFE_PERFECT_KIBBLE : 0),
    treats: firstClear ? cafeTreats(level) : 0,
  };
}

export function normalizeCafe(v: unknown): CafeState {
  const stars: Record<number, number> = {};
  const raw = v && typeof v === 'object' ? (v as Partial<CafeState>).stars : undefined;
  if (raw && typeof raw === 'object') {
    for (const [k, s] of Object.entries(raw)) {
      const level = Number(k);
      if (!Number.isInteger(level) || level < 1 || level > CAFE_LEVELS || typeof s !== 'number' || s < 1) continue;
      stars[level] = Math.min(3, Math.floor(s));
    }
  }
  return { stars };
}
