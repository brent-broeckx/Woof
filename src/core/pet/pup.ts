/**
 * The main pup: a pet you keep fed by playing. Fullness drains slowly in real
 * time; feeding costs kibble (earned from puzzles). Neglect never loses
 * anything permanently — a hungry pup is just sad (and later slows the yard).
 */

export interface PupState {
  name: string;
  breed: string;
  /** Fullness 0..100 as of `fullnessAt`. */
  fullness: number;
  fullnessAt: number;
  bondXp: number;
  adoptedAt: number;
  /** Last time the player opened the game (used for the "missed you" greeting). */
  /** Total bowls eaten (for stats/achievements). */
  meals: number;
}

export type PupMood = 'happy' | 'content' | 'hungry' | 'sad';

export const HOUR = 3_600_000;
/** A full belly lasts ~30 hours. */
export const DECAY_PER_HOUR = 100 / 30;
export const FEED_COST = 10;
export const FEED_AMOUNT = 20;
export const FEED_XP = 10;
export const WIN_XP = 2;
export const START_FULLNESS = 80;
export const START_KIBBLE = 20;
export const MAX_NAME = 16;
export const GREETING_AFTER = 8 * HOUR;

export function createPup(name: string, breed: string, now: number): PupState {
  return {
    name: cleanName(name) || 'Buddy',
    breed,
    fullness: START_FULLNESS,
    fullnessAt: now,
    bondXp: 0,
    adoptedAt: now,
    meals: 0,
  };
}

export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** Fullness right now. Clock going backwards counts as no time passing. */
export function currentFullness(pup: Pick<PupState, 'fullness' | 'fullnessAt'>, now: number): number {
  const hours = Math.max(0, now - pup.fullnessAt) / HOUR;
  return Math.max(0, Math.min(100, pup.fullness - hours * DECAY_PER_HOUR));
}

export function moodFor(fullness: number): PupMood {
  if (fullness >= 70) return 'happy';
  if (fullness >= 40) return 'content';
  if (fullness >= 15) return 'hungry';
  return 'sad';
}

export const MOOD_LABEL: Record<PupMood, string> = {
  happy: 'Happy',
  content: 'Content',
  hungry: 'Hungry',
  sad: 'Starving',
};

export const faceMood = (mood: PupMood): 'happy' | 'calm' | 'sad' => (mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : 'calm');

/** Hours until the pup's mood drops to "hungry" (0 if already there). */
export function hoursUntilHungry(fullness: number): number {
  return Math.max(0, (fullness - 40) / DECAY_PER_HOUR);
}

export const isFull = (fullness: number) => fullness >= 100 - FEED_AMOUNT / 2;

/** Feeding settles current decay into a new snapshot. */
export function feedPup(pup: PupState, now: number): PupState {
  const fullness = Math.min(100, currentFullness(pup, now) + FEED_AMOUNT);
  return { ...pup, fullness, fullnessAt: now, bondXp: pup.bondXp + FEED_XP, meals: pup.meals + 1 };
}

/** XP needed to reach each bond level (index = level - 1). */
export const BOND_THRESHOLDS = [0, 30, 80, 150, 250, 400, 600, 850, 1150, 1500];
export const MAX_BOND = BOND_THRESHOLDS.length;

export function bondLevel(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (level < MAX_BOND && xp >= BOND_THRESHOLDS[level]) level++;
  if (level >= MAX_BOND) return { level, into: 0, needed: 0 };
  const base = BOND_THRESHOLDS[level - 1];
  return { level, into: xp - base, needed: BOND_THRESHOLDS[level] - base };
}

export type TrickId = 'wag' | 'spin' | 'jump' | 'roll' | 'heart' | 'dance';

export const TRICKS: { id: TrickId; name: string; emoji: string; level: number }[] = [
  { id: 'wag', name: 'Wag', emoji: '🐕', level: 1 },
  { id: 'spin', name: 'Spin', emoji: '🌀', level: 2 },
  { id: 'jump', name: 'Jump', emoji: '⬆️', level: 3 },
  { id: 'roll', name: 'Roll over', emoji: '🔄', level: 5 },
  { id: 'heart', name: 'Love bark', emoji: '💖', level: 7 },
  { id: 'dance', name: 'Happy dance', emoji: '💃', level: 10 },
];

export const unlockedTricks = (xp: number) => TRICKS.filter((t) => t.level <= bondLevel(xp).level);

/** Shifts every timestamp back by `ms` (debug "skip time"). */
export function shiftPupTime(pup: PupState, ms: number): PupState {
  return { ...pup, fullnessAt: pup.fullnessAt - ms, adoptedAt: pup.adoptedAt - ms };
}

export function isPupState(v: unknown): v is PupState {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.breed === 'string' &&
    typeof p.fullness === 'number' &&
    typeof p.fullnessAt === 'number' &&
    typeof p.bondXp === 'number'
  );
}

/** Repairs a possibly-partial pup from an older or hand-edited save. */
export function normalizePup(v: unknown, now: number): PupState | null {
  if (!isPupState(v)) return null;
  const p = v as PupState;
  return {
    name: cleanName(p.name) || 'Buddy',
    breed: p.breed,
    fullness: Math.max(0, Math.min(100, Number.isFinite(p.fullness) ? p.fullness : START_FULLNESS)),
    fullnessAt: Number.isFinite(p.fullnessAt) ? p.fullnessAt : now,
    bondXp: Math.max(0, Number.isFinite(p.bondXp) ? p.bondXp : 0),
    adoptedAt: typeof p.adoptedAt === 'number' ? p.adoptedAt : now,
    meals: typeof p.meals === 'number' ? p.meals : 0,
  };
}

/* ---------------- Kibble income (earned by playing) ---------------- */

export const KIBBLE_BY_STARS = [0, 4, 6, 8];
export const FIRST_CLEAR_KIBBLE = 4;

/** Every main-level win pays kibble (replays too — they're the "food job"). */
export function kibbleForLevel(stars: number, firstClear: boolean): number {
  return KIBBLE_BY_STARS[Math.max(0, Math.min(3, stars))] + (firstClear ? FIRST_CLEAR_KIBBLE : 0);
}

export function kibbleForDaily(streak: number, firstTime: boolean): number {
  return firstTime ? 10 + 2 * Math.min(Math.max(streak, 1), 7) : 2;
}

export function kibbleForEndless(size: number, stars: number): number {
  return Math.max(1, size - 3) + (stars >= 3 ? 2 : 0);
}

export function kibbleForBonus(stars: number, firstClear: boolean): number {
  return firstClear ? 3 + 3 * Math.max(0, Math.min(3, stars)) : 2;
}
