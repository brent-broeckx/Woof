/**
 * The yard: your pack slowly fills a treat jar in real time. The main pup's
 * mood multiplies production, so keeping it fed pays off. Everything is
 * computed from timestamps, so offline time "just works" (up to the jar cap).
 */
import { breedById, type DogRarity } from './breeds';
import { currentFullness, DECAY_PER_HOUR, HOUR, moodFor, type PupMood, type PupState } from './pup';

export interface YardState {
  /** Treats waiting in the jar (fractional) as of `settledAt`. */
  jar: number;
  settledAt: number;
  /** Lifetime treats collected (stats). */
  collected: number;
}

/** Treats per hour for one dog of each rarity at level 1. */
export const RARITY_RATE: Record<DogRarity, number> = { common: 6, uncommon: 9, rare: 14, epic: 22, legendary: 35 };

export const MOOD_MULT: Record<PupMood, number> = { happy: 1.5, content: 1.2, hungry: 1, sad: 0.5 };

/** The jar holds this many hours of base production. */
export const JAR_HOURS = 12;

/** Fullness levels where the mood (and so the multiplier) changes. */
const MOOD_THRESHOLDS = [70, 40, 15];

export const emptyYard = (now: number): YardState => ({ jar: 0, settledAt: now, collected: 0 });

export interface Producer {
  breed: string;
  /** Pack dog level (1 for now; duplicates level dogs up later). */
  level: number;
}

/** Each extra level adds 25% of the base rate. */
export function dogRate(p: Producer): number {
  const rarity = breedById(p.breed)?.rarity ?? 'common';
  return RARITY_RATE[rarity] * (1 + 0.25 * Math.max(0, p.level - 1));
}

/** Base treats per hour of the whole pack (before the mood multiplier). */
export const packRate = (pack: Producer[]) => pack.reduce((sum, p) => sum + dogRate(p), 0);

export const jarCapacity = (rate: number) => Math.max(1, Math.round(rate * JAR_HOURS));

/** Treats produced between two moments, following the pup's mood as it gets hungrier. */
export function produced(rate: number, pup: Pick<PupState, 'fullness' | 'fullnessAt'> | null, from: number, to: number): number {
  if (!(to > from) || rate <= 0) return 0;
  if (!pup) return (rate * (to - from)) / HOUR;
  const points = [from];
  for (const th of MOOD_THRESHOLDS) {
    const t = pup.fullnessAt + ((pup.fullness - th) / DECAY_PER_HOUR) * HOUR;
    if (t > from && t < to) points.push(t);
  }
  points.sort((a, b) => a - b);
  points.push(to);
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const mood = moodFor(currentFullness(pup, (a + b) / 2));
    total += (rate * MOOD_MULT[mood] * (b - a)) / HOUR;
  }
  return total;
}

/** Brings the jar up to `now`. A clock that went backwards just restarts the timer. */
export function settleYard(yard: YardState, rate: number, pup: Pick<PupState, 'fullness' | 'fullnessAt'> | null, now: number): YardState {
  if (now <= yard.settledAt) return { ...yard, settledAt: Math.min(yard.settledAt, now) };
  const cap = jarCapacity(rate);
  const jar = Math.min(cap, Math.max(0, yard.jar) + produced(rate, pup, yard.settledAt, now));
  return { ...yard, jar, settledAt: now };
}

/** Empties the whole treats out of a settled jar (the fraction stays). */
export function collectJar(yard: YardState): { yard: YardState; amount: number } {
  const amount = Math.floor(yard.jar);
  return { yard: { ...yard, jar: yard.jar - amount, collected: yard.collected + amount }, amount };
}

/** Hours until the jar is full at the current multiplier (0 if already full). */
export function hoursUntilFull(jar: number, rate: number, mult: number): number {
  const left = jarCapacity(rate) - jar;
  return left <= 0 || rate <= 0 ? 0 : left / (rate * mult);
}

export function normalizeYard(v: unknown, now: number): YardState {
  const y = (v && typeof v === 'object' ? v : {}) as Partial<YardState>;
  const num = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? n : d);
  return {
    jar: Math.max(0, num(y.jar, 0)),
    settledAt: Math.min(now, num(y.settledAt, now)),
    collected: Math.max(0, Math.floor(num(y.collected, 0))),
  };
}
