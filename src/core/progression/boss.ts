import { hashSeed } from '../rng';

/** ISO-8601 week of a local date, e.g. "2025-W07". Weeks start on Monday. */
export function isoWeekKey(d: Date = new Date()): string {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const weekday = (day.getDay() + 6) % 7; // Monday = 0
  day.setDate(day.getDate() - weekday + 3); // Thursday of this week decides the year
  const year = day.getFullYear();
  const firstThursday = new Date(year, 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const week = 1 + Math.round((day.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Milliseconds until next Monday 00:00 local time. */
export function msUntilNextWeek(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  next.setDate(next.getDate() + (7 - ((now.getDay() + 6) % 7)));
  return next.getTime() - now.getTime();
}

export interface BossConfig {
  week: string;
  size: number;
  minDifficulty: number;
  maxDifficulty: number;
  seed: number;
}

export const bossConfig = (week: string): BossConfig => ({ week, size: 10, minDifficulty: 5, maxDifficulty: 6, seed: hashSeed('boss', week) });

export const BOSS_REWARD = { kibble: 50, treats: 150 };
/** Extra kibble the first time a week's boss is beaten flawlessly (no mistakes, no power-ups). */
export const BOSS_FLAWLESS_KIBBLE = 30;

export interface BossRecord {
  stars: number;
  timeMs: number;
}

export interface BossState {
  records: Record<string, BossRecord>;
}

export const emptyBoss = (): BossState => ({ records: {} });

export interface BossOutcome {
  stars: number;
  timeMs: number;
}

export interface BossResult {
  state: BossState;
  firstClear: boolean;
  firstFlawless: boolean;
  newBest: boolean;
  kibble: number;
  treats: number;
}

export function applyBossCompletion(state: BossState, week: string, outcome: BossOutcome): BossResult {
  const stars = Math.max(1, Math.min(3, Math.floor(outcome.stars)));
  const timeMs = Math.max(0, Math.round(outcome.timeMs));
  const prev = state.records[week];
  const firstClear = !prev;
  const firstFlawless = stars === 3 && (prev?.stars ?? 0) < 3;
  const newBest = !prev || stars > prev.stars || (stars === prev.stars && timeMs < prev.timeMs);
  const kibble = (firstClear ? BOSS_REWARD.kibble : 0) + (firstFlawless ? BOSS_FLAWLESS_KIBBLE : 0);
  const treats = firstClear ? BOSS_REWARD.treats : 0;
  return {
    state: newBest ? { records: { ...state.records, [week]: { stars, timeMs } } } : state,
    firstClear,
    firstFlawless,
    newBest,
    kibble,
    treats,
  };
}

export const bossesCleared = (state: BossState) => Object.keys(state.records).length;
export const bossesFlawless = (state: BossState) => Object.values(state.records).filter((r) => r.stars >= 3).length;

export function normalizeBoss(v: unknown): BossState {
  const records: Record<string, BossRecord> = {};
  const raw = v && typeof v === 'object' ? (v as Partial<BossState>).records : undefined;
  if (raw && typeof raw === 'object') {
    for (const [week, r] of Object.entries(raw)) {
      if (!/^\d{4}-W\d{2}$/.test(week) || !r || typeof r.stars !== 'number' || typeof r.timeMs !== 'number') continue;
      records[week] = { stars: Math.max(1, Math.min(3, Math.floor(r.stars))), timeMs: Math.max(0, r.timeMs) };
    }
  }
  return { records };
}
