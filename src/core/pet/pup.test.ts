import { describe, expect, it } from 'vitest';
import { BREED_CATALOG, BOARD_BREED_COUNT, STARTER_BREEDS } from './breeds';
import {
  bondLevel,
  createPup,
  currentFullness,
  DECAY_PER_HOUR,
  feedPup,
  FEED_AMOUNT,
  HOUR,
  kibbleForBonus,
  kibbleForDaily,
  kibbleForLevel,
  moodFor,
  normalizePup,
  shiftPupTime,
  START_FULLNESS,
  unlockedTricks,
} from './pup';

const T0 = 1_700_000_000_000;

describe('pup', () => {
  it('starts fairly full and decays linearly', () => {
    const pup = createPup('  Rex  ', 'corgi', T0);
    expect(pup.name).toBe('Rex');
    expect(currentFullness(pup, T0)).toBe(START_FULLNESS);
    expect(currentFullness(pup, T0 + 3 * HOUR)).toBeCloseTo(START_FULLNESS - 3 * DECAY_PER_HOUR);
    expect(currentFullness(pup, T0 + 100 * HOUR)).toBe(0);
  });

  it('ignores clocks going backwards', () => {
    const pup = createPup('Rex', 'corgi', T0);
    expect(currentFullness(pup, T0 - 5 * HOUR)).toBe(START_FULLNESS);
  });

  it('maps fullness to moods', () => {
    expect(moodFor(100)).toBe('happy');
    expect(moodFor(50)).toBe('content');
    expect(moodFor(20)).toBe('hungry');
    expect(moodFor(5)).toBe('sad');
  });

  it('feeding settles decay, caps at 100 and grants bond xp', () => {
    let pup = createPup('Rex', 'corgi', T0);
    pup = feedPup(pup, T0 + 6 * HOUR);
    expect(pup.fullness).toBeCloseTo(START_FULLNESS - 6 * DECAY_PER_HOUR + FEED_AMOUNT);
    expect(pup.fullnessAt).toBe(T0 + 6 * HOUR);
    pup = feedPup(feedPup(pup, T0 + 6 * HOUR), T0 + 6 * HOUR);
    expect(pup.fullness).toBe(100);
    expect(pup.meals).toBe(3);
    expect(pup.bondXp).toBeGreaterThan(0);
  });

  it('bond levels progress and unlock tricks', () => {
    expect(bondLevel(0)).toEqual({ level: 1, into: 0, needed: 30 });
    expect(bondLevel(35).level).toBe(2);
    expect(bondLevel(99999).level).toBe(10);
    expect(unlockedTricks(0).map((t) => t.id)).toEqual(['wag']);
    expect(unlockedTricks(99999)).toHaveLength(6);
  });

  it('time shifting moves all timestamps', () => {
    const pup = shiftPupTime(createPup('Rex', 'corgi', T0), HOUR);
    expect(pup.fullnessAt).toBe(T0 - HOUR);
    expect(pup.adoptedAt).toBe(T0 - HOUR);
  });

  it('normalizes broken saves', () => {
    expect(normalizePup(null, T0)).toBeNull();
    expect(normalizePup({ name: 'x' }, T0)).toBeNull();
    const fixed = normalizePup({ name: '', breed: 'husky', fullness: 500, fullnessAt: T0, bondXp: -3 }, T0);
    expect(fixed?.name).toBe('Buddy');
    expect(fixed?.fullness).toBe(100);
    expect(fixed?.bondXp).toBe(0);
    expect(fixed?.meals).toBe(0);
  });

  it('kibble income rewards play', () => {
    expect(kibbleForLevel(3, true)).toBe(12);
    expect(kibbleForLevel(1, false)).toBe(4);
    expect(kibbleForDaily(1, true)).toBe(12);
    expect(kibbleForDaily(30, true)).toBe(24);
    expect(kibbleForBonus(3, true)).toBe(12);
    expect(kibbleForBonus(3, false)).toBe(2);
  });
});

describe('breeds', () => {
  it('has unique ids, board breeds and starters', () => {
    const ids = new Set(BREED_CATALOG.map((b) => b.id));
    expect(ids.size).toBe(BREED_CATALOG.length);
    expect(BREED_CATALOG.length).toBeGreaterThan(BOARD_BREED_COUNT);
    expect(STARTER_BREEDS.length).toBe(6);
  });
});
