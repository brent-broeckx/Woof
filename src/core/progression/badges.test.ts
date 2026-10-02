import { describe, expect, it } from 'vitest';
import { emptyArcade } from './arcade';
import { allBadgeStatus, BADGES, badgeById, badgeForCosmetic, claimableCount, normalizeBadges, pendingRewards, tierReward, type BadgeInput } from './badges';
import { emptyBoss } from './boss';
import { applyCafeCompletion, emptyCafe } from './catCafe';

const input = (over: Partial<BadgeInput> = {}): BadgeInput => ({
  progress: {},
  totals: { puzzlesSolved: 0, dailySolved: 0, endlessSolved: 0, bonusPlayed: 0, flawless: 0 },
  dailyBest: 0,
  chests: {},
  arcade: emptyArcade(),
  album: {},
  pack: [],
  bondXp: 0,
  boss: emptyBoss(),
  cafe: emptyCafe(),
  ...over,
});

const status = (id: string, i: BadgeInput, claimed: Record<string, number> = {}) => allBadgeStatus(i, claimed).find((b) => b.badge.id === id)!;

describe('badges', () => {
  it('have unique ids and ascending tiers', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(b.tiers.length).toBeGreaterThan(0);
      for (let i = 1; i < b.tiers.length; i++) expect(b.tiers[i]).toBeGreaterThan(b.tiers[i - 1]);
    }
  });

  it('a fresh save has nothing to claim', () => {
    expect(claimableCount(input(), {})).toBe(0);
    expect(allBadgeStatus(input(), {}).every((b) => b.earned === 0)).toBe(true);
  });

  it('counts solves across modes into tiers', () => {
    const i = input({ totals: { puzzlesSolved: 60, dailySolved: 30, endlessSolved: 10, bonusPlayed: 0, flawless: 0 } });
    const s = status('solver', i);
    expect(s).toMatchObject({ value: 100, earned: 2, claimed: 0, next: 500 });
    expect(pendingRewards(s)).toEqual([tierReward(s.badge, 1), tierReward(s.badge, 2)]);
    expect(status('solver', i, { solver: 1 }).claimed).toBe(1);
    expect(claimableCount(i, { solver: 2 })).toBe(0);
  });

  it('backfills flawless from 3-star levels', () => {
    const progress: Record<number, { stars: number }> = {};
    for (let id = 1; id <= 8; id++) progress[id] = { stars: 3 };
    expect(status('flawless', input({ progress })).value).toBeGreaterThanOrEqual(5);
  });

  it('counts weekly bosses', () => {
    const boss = { records: { '2025-W01': { stars: 3, timeMs: 1 }, '2025-W02': { stars: 1, timeMs: 1 } } };
    expect(status('boss', input({ boss })).earned).toBe(1);
  });

  it('maps exclusive cosmetics to their badge tier', () => {
    expect(badgeForCosmetic('medal')).toMatchObject({ badge: badgeById('flawless'), tier: 3 });
    expect(badgeForCosmetic('bandana')).toBeNull();
  });

  it('normalizes claimed tiers', () => {
    expect(normalizeBadges({ solver: 9, nope: 1, streak: -1, stars: 1.7 })).toEqual({ solver: 3, stars: 1 });
    expect(normalizeBadges('x')).toEqual({});
  });

  it('track Cat Café clears and give cat ears at gold', () => {
    let cafe = emptyCafe();
    for (let l = 1; l <= 30; l++) cafe = applyCafeCompletion(cafe, l, l <= 10 ? 3 : 2).state;
    expect(status('cats', input({ cafe })).earned).toBe(3);
    expect(status('purrfect', input({ cafe })).earned).toBe(2);
    expect(badgeForCosmetic('catEars')).toMatchObject({ badge: { id: 'cats' }, tier: 3 });
  });
});
