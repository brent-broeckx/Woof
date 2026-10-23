import { describe, expect, it } from 'vitest';
import { breedById } from './breeds';
import { addToPack, emptyFair, FAIR_PITY, MAX_DOG_LEVEL, newDog, normalizeFair, normalizePack, rollFair, trainCost, type FairState } from './pack';

describe('pack', () => {
  it('adds new dogs and levels up duplicates', () => {
    let pack = [newDog('corgi', 'starter', 0)];
    const r1 = addToPack(pack, 'pug', 'fair', 0);
    expect(r1.isNew).toBe(true);
    pack = r1.pack;
    const r2 = addToPack(pack, 'pug', 'fair', 0);
    expect(r2.levelUp).toBe(true);
    expect(r2.pack.find((d) => d.breed === 'pug')?.level).toBe(2);
    const r3 = addToPack(r2.pack, 'pug', 'fair', 0);
    expect(r3.levelUp).toBe(false);
    expect(r3.pack.find((d) => d.breed === 'pug')?.copies).toBe(1);
  });

  it('stops at the max level', () => {
    const pack = [{ ...newDog('pug', 'fair', 0), level: MAX_DOG_LEVEL }];
    expect(addToPack(pack, 'pug', 'fair', 0).pack).toBe(pack);
  });

  it('training costs more for higher levels and rarities', () => {
    expect(trainCost('common', 2)).toBeGreaterThan(trainCost('common', 1));
    expect(trainCost('legendary', 1)).toBeGreaterThan(trainCost('common', 1));
  });
});

describe('adoption fair', () => {
  it('is deterministic per pull index', () => {
    const a = rollFair(42, emptyFair());
    const b = rollFair(42, emptyFair());
    expect(a).toEqual(b);
    expect(breedById(a.breed).rarity).toBe(a.rarity);
    expect(a.fair.pulls).toBe(1);
  });

  it('guarantees a rare-or-better dog at the pity limit', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = rollFair(seed, { pulls: seed, sinceRare: FAIR_PITY - 1 });
      expect(['rare', 'epic', 'legendary']).toContain(r.rarity);
      expect(r.fair.sinceRare).toBe(0);
    }
  });

  it('never goes longer than the pity limit without a rare', () => {
    let fair: FairState = emptyFair();
    let longest = 0;
    for (let i = 0; i < 500; i++) {
      const r = rollFair(7, fair);
      fair = r.fair;
      longest = Math.max(longest, fair.sinceRare);
    }
    expect(longest).toBeLessThan(FAIR_PITY);
  });

  it('roughly follows the published odds', () => {
    let fair: FairState = emptyFair();
    let commons = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollFair(99, { ...fair, sinceRare: 0 });
      fair = r.fair;
      if (r.rarity === 'common') commons++;
    }
    expect(commons / 2000).toBeGreaterThan(0.48);
    expect(commons / 2000).toBeLessThan(0.62);
  });

  it('sanitizes saved data', () => {
    expect(normalizePack([{ breed: 'nope' }, { breed: 'pug', level: 99 }, { breed: 'pug' }], 5)).toEqual([
      { breed: 'pug', name: '', level: MAX_DOG_LEVEL, copies: 0, source: 'starter', adoptedAt: 5 },
    ]);
    expect(normalizeFair({ pulls: -3, sinceRare: 500 })).toEqual({ pulls: 0, sinceRare: FAIR_PITY - 1 });
  });
});
