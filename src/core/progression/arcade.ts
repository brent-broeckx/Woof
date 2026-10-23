import { hashSeed } from '../rng';
import { BONUS_EVERY, getLevel, MINI_GAME_IDS, TOTAL_LEVELS, type MiniGameId } from './levels';

/** Arcade difficulty steps, each mapped to a bonus-park tier. */
export const ARCADE_DIFFICULTIES = [
  { id: 'pup', name: 'Pup', tier: 1 },
  { id: 'goodBoy', name: 'Good Boy', tier: 5 },
  { id: 'topDog', name: 'Top Dog', tier: 10 },
  { id: 'legend', name: 'Legend', tier: 20 },
] as const;

/** Every game × difficulty combination (one medal each). */
export const ARCADE_SLOTS = MINI_GAME_IDS.length * ARCADE_DIFFICULTIES.length;

export type ArcadeDifficulty = (typeof ARCADE_DIFFICULTIES)[number]['id'];

/** Kibble the Arcade can pay out per local day. */
export const ARCADE_DAILY_KIBBLE = 20;

export const MEDALS = ['', '🥉', '🥈', '🥇'] as const;
export const MEDAL_NAMES = ['', 'Bronze', 'Silver', 'Gold'] as const;

export interface ArcadeRecord {
  stars: number;
  /** Fastest finish at `stars`. */
  timeMs: number;
}

export interface ArcadeState {
  plays: number;
  /** Local date key of `kibbleToday`. */
  day: string;
  kibbleToday: number;
  records: Record<string, ArcadeRecord>;
}

export const emptyArcade = (): ArcadeState => ({ plays: 0, day: '', kibbleToday: 0, records: {} });

export const recordKey = (game: MiniGameId, difficulty: ArcadeDifficulty) => `${game}:${difficulty}`;

export const difficultyById = (id: string) => ARCADE_DIFFICULTIES.find((d) => d.id === id);

/** Mini-games whose bonus park has been cleared, plus the highest bonus tier cleared. */
export function arcadeUnlocks(cleared: (levelId: number) => boolean, all = false): { games: Set<MiniGameId>; maxTier: number } {
  if (all) return { games: new Set(MINI_GAME_IDS), maxTier: ARCADE_DIFFICULTIES[ARCADE_DIFFICULTIES.length - 1].tier };
  const games = new Set<MiniGameId>();
  let maxTier = 0;
  for (let id = BONUS_EVERY; id <= TOTAL_LEVELS; id += BONUS_EVERY) {
    if (!cleared(id)) continue;
    const level = getLevel(id);
    if (level.kind !== 'bonus') continue;
    games.add(level.game);
    maxTier = Math.max(maxTier, level.tier);
  }
  return { games, maxTier };
}

export function difficultyUnlocked(difficulty: ArcadeDifficulty, maxTier: number): boolean {
  const d = difficultyById(difficulty);
  return !!d && maxTier >= d.tier;
}

/** `attempt` changes the puzzle when a run is quit and restarted before it counts. */
export const arcadeSeed = (saveSeed: number, plays: number, attempt = 0) => hashSeed(saveSeed, 'arcade', plays, attempt);

/** Kibble for one run before the daily cap: stars plus the difficulty step. */
export function arcadeKibble(stars: number, difficulty: ArcadeDifficulty): number {
  const step = ARCADE_DIFFICULTIES.findIndex((d) => d.id === difficulty);
  return Math.max(0, Math.min(3, stars)) + Math.max(0, step);
}

export function kibbleLeftToday(state: ArcadeState, today: string): number {
  return ARCADE_DAILY_KIBBLE - (state.day === today ? state.kibbleToday : 0);
}

export interface ArcadeRun {
  state: ArcadeState;
  kibble: number;
  /** The run beat the previous record (more stars, or same stars and faster). */
  newBest: boolean;
  /** Medal tier (1–3) newly reached, or 0. */
  newMedal: number;
  previous: ArcadeRecord | null;
}

export function recordArcadeRun(
  state: ArcadeState,
  game: MiniGameId,
  difficulty: ArcadeDifficulty,
  rawStars: number,
  timeMs: number,
  today: string,
): ArcadeRun {
  const stars = Math.max(1, Math.min(3, Math.floor(rawStars)));
  const time = Math.max(0, Math.round(timeMs));
  const key = recordKey(game, difficulty);
  const previous = state.records[key] ?? null;
  const newBest = !previous || stars > previous.stars || (stars === previous.stars && time < previous.timeMs);
  const newMedal = !previous || stars > previous.stars ? stars : 0;
  const used = state.day === today ? state.kibbleToday : 0;
  const kibble = Math.max(0, Math.min(arcadeKibble(stars, difficulty), ARCADE_DAILY_KIBBLE - used));
  return {
    state: {
      plays: state.plays + 1,
      day: today,
      kibbleToday: used + kibble,
      records: newBest ? { ...state.records, [key]: { stars, timeMs: time } } : state.records,
    },
    kibble,
    newBest,
    newMedal,
    previous,
  };
}

/** Counts of medals earned (best per game and difficulty). */
export function medalCounts(state: ArcadeState): { bronze: number; silver: number; gold: number } {
  const c = { bronze: 0, silver: 0, gold: 0 };
  for (const r of Object.values(state.records)) {
    if (r.stars >= 3) c.gold++;
    else if (r.stars === 2) c.silver++;
    else if (r.stars === 1) c.bronze++;
  }
  return c;
}

export function normalizeArcade(v: unknown): ArcadeState {
  const base = emptyArcade();
  if (!v || typeof v !== 'object') return base;
  const o = v as Partial<ArcadeState>;
  const records: Record<string, ArcadeRecord> = {};
  if (o.records && typeof o.records === 'object') {
    for (const [key, r] of Object.entries(o.records)) {
      const [game, diff] = key.split(':');
      if (!MINI_GAME_IDS.includes(game as MiniGameId) || !difficultyById(diff)) continue;
      if (!r || typeof r.stars !== 'number' || typeof r.timeMs !== 'number') continue;
      records[key] = { stars: Math.max(1, Math.min(3, Math.floor(r.stars))), timeMs: Math.max(0, r.timeMs) };
    }
  }
  return {
    plays: typeof o.plays === 'number' && o.plays >= 0 ? Math.floor(o.plays) : 0,
    day: typeof o.day === 'string' ? o.day : '',
    kibbleToday: typeof o.kibbleToday === 'number' ? Math.max(0, Math.min(ARCADE_DAILY_KIBBLE, o.kibbleToday)) : 0,
    records,
  };
}
