import { describe, expect, it } from 'vitest';
import { applyDailyCompletion, currentStreak, dailyConfig, dateKey, emptyDaily, previousDateKey } from './daily';

describe('daily puzzle', () => {
  it('formats and steps back dates across month and year boundaries', () => {
    expect(dateKey(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(previousDateKey('2025-03-01')).toBe('2025-02-28');
    expect(previousDateKey('2025-01-01')).toBe('2024-12-31');
  });

  it('gives the same config for the same date and varies by weekday', () => {
    expect(dailyConfig('2025-06-02')).toEqual(dailyConfig('2025-06-02'));
    expect(dailyConfig('2025-06-02').seed).not.toBe(dailyConfig('2025-06-03').seed);
    expect(dailyConfig('2025-06-02').size).toBe(6); // Monday
    expect(dailyConfig('2025-06-08').size).toBe(9); // Sunday
  });

  it('builds and breaks streaks', () => {
    let r = emptyDaily();
    ({ record: r } = applyDailyCompletion(r, '2025-06-01', 2));
    ({ record: r } = applyDailyCompletion(r, '2025-06-02', 3));
    expect(r.streak).toBe(2);
    const replay = applyDailyCompletion(r, '2025-06-02', 1);
    expect(replay.firstTime).toBe(false);
    expect(replay.record.streak).toBe(2);
    expect(replay.record.completed['2025-06-02']).toBe(3);
    ({ record: r } = applyDailyCompletion(r, '2025-06-05', 1));
    expect(r.streak).toBe(1);
    expect(r.best).toBe(2);
    expect(currentStreak(r, '2025-06-06')).toBe(1);
    expect(currentStreak(r, '2025-06-07')).toBe(0);
  });
});
