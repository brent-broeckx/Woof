import { describe, expect, it } from 'vitest';
import {
  ARCADE_DAILY_KIBBLE,
  arcadeKibble,
  arcadeSeed,
  arcadeUnlocks,
  difficultyUnlocked,
  emptyArcade,
  kibbleLeftToday,
  medalCounts,
  normalizeArcade,
  recordArcadeRun,
} from './arcade';
import { getLevel } from './levels';

describe('arcade', () => {
  it('unlocks games from cleared bonus parks', () => {
    expect(arcadeUnlocks(() => false).games.size).toBe(0);
    const first = getLevel(5);
    const u = arcadeUnlocks((id) => id === 5);
    expect(first.kind).toBe('bonus');
    if (first.kind === 'bonus') expect([...u.games]).toEqual([first.game]);
    expect(u.maxTier).toBe(1);
    expect(difficultyUnlocked('pup', u.maxTier)).toBe(true);
    expect(difficultyUnlocked('goodBoy', u.maxTier)).toBe(false);
    expect(difficultyUnlocked('goodBoy', arcadeUnlocks((id) => id <= 25).maxTier)).toBe(true);
    expect(arcadeUnlocks(() => false, true).games.size).toBe(10);
  });

  it('pays stars plus difficulty, capped per day', () => {
    expect(arcadeKibble(1, 'pup')).toBe(1);
    expect(arcadeKibble(3, 'legend')).toBe(6);
    let state = emptyArcade();
    let total = 0;
    for (let i = 0; i < 10; i++) {
      const run = recordArcadeRun(state, 'waterSort', 'legend', 3, 1000, '2024-01-01');
      state = run.state;
      total += run.kibble;
    }
    expect(total).toBe(ARCADE_DAILY_KIBBLE);
    expect(kibbleLeftToday(state, '2024-01-01')).toBe(0);
    expect(kibbleLeftToday(state, '2024-01-02')).toBe(ARCADE_DAILY_KIBBLE);
    expect(recordArcadeRun(state, 'waterSort', 'pup', 3, 1000, '2024-01-02').kibble).toBe(3);
    expect(state.plays).toBe(10);
  });

  it('keeps the best record and reports new medals', () => {
    let run = recordArcadeRun(emptyArcade(), 'bubbleShooter', 'pup', 2, 5000, 'd');
    expect(run).toMatchObject({ newBest: true, newMedal: 2 });
    run = recordArcadeRun(run.state, 'bubbleShooter', 'pup', 1, 1000, 'd');
    expect(run).toMatchObject({ newBest: false, newMedal: 0 });
    run = recordArcadeRun(run.state, 'bubbleShooter', 'pup', 2, 4000, 'd');
    expect(run).toMatchObject({ newBest: true, newMedal: 0 });
    expect(run.state.records['bubbleShooter:pup']).toEqual({ stars: 2, timeMs: 4000 });
    run = recordArcadeRun(run.state, 'bubbleShooter', 'pup', 3, 9000, 'd');
    expect(run.newMedal).toBe(3);
    run = recordArcadeRun(run.state, 'rushHour', 'pup', 0, 9000, 'd');
    expect(run.state.records['rushHour:pup'].stars).toBe(1);
    expect(medalCounts(run.state)).toEqual({ bronze: 1, silver: 0, gold: 1 });
  });

  it('seeds every play differently', () => {
    expect(arcadeSeed(1, 0)).not.toBe(arcadeSeed(1, 1));
    expect(arcadeSeed(1, 3)).toBe(arcadeSeed(1, 3));
  });

  it('normalizes saved data', () => {
    expect(normalizeArcade(null)).toEqual(emptyArcade());
    const n = normalizeArcade({
      plays: 4,
      day: 'x',
      kibbleToday: 999,
      records: { 'waterSort:pup': { stars: 9, timeMs: 10 }, 'nope:pup': { stars: 1, timeMs: 1 }, 'waterSort:hard': { stars: 1, timeMs: 1 } },
    });
    expect(n).toEqual({ plays: 4, day: 'x', kibbleToday: ARCADE_DAILY_KIBBLE, records: { 'waterSort:pup': { stars: 3, timeMs: 10 } } });
  });
});
