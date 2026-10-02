import { describe, expect, it } from 'vitest';
import {
  applyBossCompletion,
  BOSS_FLAWLESS_KIBBLE,
  BOSS_REWARD,
  bossConfig,
  bossesCleared,
  bossesFlawless,
  emptyBoss,
  isoWeekKey,
  msUntilNextWeek,
  normalizeBoss,
} from './boss';

describe('isoWeekKey', () => {
  it('handles year boundaries', () => {
    expect(isoWeekKey(new Date(2021, 0, 3))).toBe('2020-W53');
    expect(isoWeekKey(new Date(2021, 0, 4))).toBe('2021-W01');
    expect(isoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
    expect(isoWeekKey(new Date(2025, 1, 12))).toBe('2025-W07');
  });

  it('keeps Monday to Sunday in one week', () => {
    const mon = isoWeekKey(new Date(2025, 2, 3));
    for (let d = 3; d <= 9; d++) expect(isoWeekKey(new Date(2025, 2, d, 23, 59))).toBe(mon);
    expect(isoWeekKey(new Date(2025, 2, 10))).not.toBe(mon);
  });
});

describe('msUntilNextWeek', () => {
  it('counts down to Monday midnight', () => {
    expect(msUntilNextWeek(new Date(2025, 2, 9, 23, 0))).toBe(3_600_000);
    expect(msUntilNextWeek(new Date(2025, 2, 3, 0, 0))).toBe(7 * 86_400_000);
  });
});

describe('bossConfig', () => {
  it('is deterministic per week', () => {
    expect(bossConfig('2025-W07')).toEqual(bossConfig('2025-W07'));
    expect(bossConfig('2025-W07').seed).not.toBe(bossConfig('2025-W08').seed);
    expect(bossConfig('2025-W07').minDifficulty).toBeLessThanOrEqual(bossConfig('2025-W07').maxDifficulty);
  });
});

describe('applyBossCompletion', () => {
  it('rewards the first clear and the first flawless run once', () => {
    const a = applyBossCompletion(emptyBoss(), '2025-W07', { stars: 2, timeMs: 500_000 });
    expect(a).toMatchObject({ firstClear: true, firstFlawless: false, newBest: true, kibble: BOSS_REWARD.kibble, treats: BOSS_REWARD.treats });
    const b = applyBossCompletion(a.state, '2025-W07', { stars: 2, timeMs: 600_000 });
    expect(b).toMatchObject({ firstClear: false, newBest: false, kibble: 0, treats: 0 });
    expect(b.state).toBe(a.state);
    const c = applyBossCompletion(a.state, '2025-W07', { stars: 3, timeMs: 700_000 });
    expect(c).toMatchObject({ firstFlawless: true, newBest: true, kibble: BOSS_FLAWLESS_KIBBLE, treats: 0 });
    const d = applyBossCompletion(c.state, '2025-W07', { stars: 3, timeMs: 400_000 });
    expect(d).toMatchObject({ firstFlawless: false, newBest: true, kibble: 0 });
    expect(d.state.records['2025-W07']).toEqual({ stars: 3, timeMs: 400_000 });
  });

  it('pays both bonuses for a flawless first clear', () => {
    const r = applyBossCompletion(emptyBoss(), '2025-W07', { stars: 3, timeMs: 1 });
    expect(r.kibble).toBe(BOSS_REWARD.kibble + BOSS_FLAWLESS_KIBBLE);
    expect(bossesCleared(r.state)).toBe(1);
    expect(bossesFlawless(r.state)).toBe(1);
  });
});

describe('normalizeBoss', () => {
  it('drops junk and clamps values', () => {
    expect(normalizeBoss(null)).toEqual(emptyBoss());
    expect(normalizeBoss({ records: { '2025-W07': { stars: 9, timeMs: -5 }, bad: { stars: 1, timeMs: 1 }, '2025-W08': 'x' } })).toEqual({
      records: { '2025-W07': { stars: 3, timeMs: 0 } },
    });
  });
});
