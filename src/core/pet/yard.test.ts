import { describe, expect, it } from 'vitest';
import { createPup, HOUR } from './pup';
import { collectJar, dogRate, emptyYard, hoursUntilFull, jarCapacity, JAR_HOURS, normalizeYard, packRate, produced, settleYard } from './yard';

const T0 = 1_700_000_000_000;

describe('yard production', () => {
  it('rates scale with rarity and level', () => {
    expect(dogRate({ breed: 'corgi', level: 1 })).toBe(6);
    expect(dogRate({ breed: 'corgi', level: 3 })).toBe(9);
    expect(dogRate({ breed: 'cosmiccorgi', level: 1 })).toBeGreaterThan(dogRate({ breed: 'samoyed', level: 1 }));
    expect(
      packRate([
        { breed: 'corgi', level: 1 },
        { breed: 'husky', level: 1 },
      ]),
    ).toBe(dogRate({ breed: 'corgi', level: 1 }) + dogRate({ breed: 'husky', level: 1 }));
  });

  it('applies the happy multiplier while the pup is well fed', () => {
    const pup = { ...createPup('Rex', 'corgi', T0), fullness: 100 };
    expect(produced(6, pup, T0, T0 + HOUR)).toBeCloseTo(9);
  });

  it('follows the mood down as the pup gets hungry', () => {
    const pup = { ...createPup('Rex', 'corgi', T0), fullness: 100 };
    // 100 → 70 takes 9h (×1.5), 70 → 40 another 9h (×1.2).
    expect(produced(10, pup, T0, T0 + 18 * HOUR)).toBeCloseTo(10 * 9 * 1.5 + 10 * 9 * 1.2);
    // A starving pup halves production.
    const starving = { ...pup, fullness: 0 };
    expect(produced(10, starving, T0, T0 + 2 * HOUR)).toBeCloseTo(10);
  });

  it('never produces for zero or negative spans', () => {
    expect(produced(6, null, T0, T0)).toBe(0);
    expect(produced(6, null, T0, T0 - HOUR)).toBe(0);
  });

  it('caps the jar and survives clock changes', () => {
    const pup = { ...createPup('Rex', 'corgi', T0), fullness: 100 };
    const y = settleYard(emptyYard(T0), 6, pup, T0 + 1000 * HOUR);
    expect(y.jar).toBe(jarCapacity(6));
    expect(jarCapacity(6)).toBe(6 * JAR_HOURS);
    const back = settleYard(y, 6, pup, T0);
    expect(back.jar).toBe(y.jar);
    expect(back.settledAt).toBe(T0);
  });

  it('collects whole treats and keeps the fraction', () => {
    const { yard, amount } = collectJar({ jar: 12.75, settledAt: T0, collected: 3 });
    expect(amount).toBe(12);
    expect(yard.jar).toBeCloseTo(0.75);
    expect(yard.collected).toBe(15);
  });

  it('reports time until full', () => {
    expect(hoursUntilFull(0, 6, 1)).toBe(JAR_HOURS);
    expect(hoursUntilFull(72, 6, 1.5)).toBe(0);
  });

  it('repairs bad yard data', () => {
    expect(normalizeYard(undefined, T0)).toEqual(emptyYard(T0));
    expect(normalizeYard({ jar: -5, settledAt: T0 + HOUR, collected: 2.5 }, T0)).toEqual({ jar: 0, settledAt: T0, collected: 2 });
  });
});
