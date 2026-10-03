import { describe, expect, it } from 'vitest';
import {
  bonusGameSequence,
  extraPuzzleSpec,
  getLevel,
  isBonusLevel,
  isExtraLevel,
  MAX_BONUS_TIER,
  MINI_GAME_IDS,
  TOTAL_LEVELS,
  WORLDS,
} from '../progression/levels';
import { POWER_UPS } from './powerups';
import { rollBonusReward, rollChest } from './rewards';
import { BOARD_THEMES, ACCESSORIES, cosmeticPrice } from './cosmetics';

describe('world chest & cosmetics', () => {
  it('scales chest size and treats with stars', () => {
    const low = rollChest(1, 1, 25, 75);
    const high = rollChest(1, 1, 75, 75);
    expect(low.items).toHaveLength(3);
    expect(high.items).toHaveLength(5);
    expect(high.treats).toBeGreaterThan(low.treats);
    for (const id of high.items) expect(POWER_UPS[id]).toBeDefined();
    expect(POWER_UPS[high.items[0]].rarity).toBe('rare');
    expect(rollChest(7, 2, 60, 75)).toEqual(rollChest(7, 2, 60, 75));
  });

  it('has unique cosmetic ids with 11 yard colours per theme', () => {
    const ids = [...BOARD_THEMES.map((t) => t.id), ...ACCESSORIES.map((a) => a.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BOARD_THEMES) expect(t.regionColors).toHaveLength(11);
    expect(cosmeticPrice('classic')).toBe(0);
    expect(cosmeticPrice('crown')).toBeGreaterThan(0);
  });
});

describe('progression', () => {
  it('puts a bonus level on every 5th level', () => {
    for (let id = 1; id <= TOTAL_LEVELS; id++) {
      expect(getLevel(id).kind).toBe(isBonusLevel(id) ? 'bonus' : 'puzzle');
    }
    expect(getLevel(5)).toMatchObject({ kind: 'bonus', game: 'connectLeashes', tier: 1 });
    expect(getLevel(10)).toMatchObject({ kind: 'bonus', game: 'blockDrop' });
    expect(getLevel(15)).toMatchObject({ kind: 'bonus', game: 'slidingPup' });
    expect(getLevel(20)).toMatchObject({ kind: 'bonus', game: 'kibbleBlocks' });
    expect(getLevel(35)).toMatchObject({ kind: 'bonus', game: 'rushHour' });
    expect(getLevel(50)).toMatchObject({ kind: 'bonus', game: 'pipeSprinklers' });
    expect(getLevel(6)).toMatchObject({ kind: 'puzzle', puzzleIndex: 4 });
  });

  it('never repeats a mini-game back-to-back', () => {
    const seq = bonusGameSequence(40);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  });

  it('keeps going past the last world with extra levels', () => {
    const before = Array.from({ length: TOTAL_LEVELS / 5 }, (_, i) => getLevel((i + 1) * 5));
    expect(isExtraLevel(TOTAL_LEVELS)).toBe(false);
    expect(isExtraLevel(TOTAL_LEVELS + 1)).toBe(true);
    for (let id = TOTAL_LEVELS + 1; id <= TOTAL_LEVELS * 4; id++) {
      const level = getLevel(id);
      expect(level.world).toBe(WORLDS.length);
      if (level.kind === 'bonus') {
        expect(level.tier).toBe(MAX_BONUS_TIER);
        expect(MINI_GAME_IDS).toContain(level.game);
        const prev = getLevel(id - 5);
        if (prev.kind === 'bonus') expect(prev.game).not.toBe(level.game);
      } else {
        expect(extraPuzzleSpec(id)).toEqual(extraPuzzleSpec(id));
        expect(extraPuzzleSpec(id).size).toBeGreaterThanOrEqual(9);
      }
    }
    // Growing the rotation must not change the games of the world levels.
    expect(Array.from({ length: TOTAL_LEVELS / 5 }, (_, i) => getLevel((i + 1) * 5))).toEqual(before);
    expect(extraPuzzleSpec(TOTAL_LEVELS + 1).seed).not.toBe(extraPuzzleSpec(TOTAL_LEVELS + 6).seed);
  });
});

describe('rewards', () => {
  const base = { saveSeed: 1, levelId: 5, game: 'connectLeashes' as const, previousStars: 0, pity: 0 };

  it('grants one roll per star and is deterministic', () => {
    const a = rollBonusReward({ ...base, stars: 3 });
    expect(a.items).toHaveLength(3);
    expect(rollBonusReward({ ...base, stars: 3 })).toEqual(a);
    expect(POWER_UPS[a.items[0]].rarity).toBe('uncommon');
  });

  it('only grants the improvement on replays', () => {
    expect(rollBonusReward({ ...base, previousStars: 2, stars: 3 }).items).toHaveLength(1);
    expect(rollBonusReward({ ...base, previousStars: 3, stars: 2 }).items).toHaveLength(0);
  });

  it('pity timer guarantees a rare item', () => {
    const r = rollBonusReward({ ...base, stars: 1, pity: 3 });
    const rarities = r.items.map((i) => POWER_UPS[i].rarity);
    expect(rarities.some((x) => x === 'rare' || x === 'epic')).toBe(true);
    expect(r.pity).toBe(0);
  });
});
