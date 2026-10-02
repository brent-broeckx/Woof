import type { MiniGameId } from '../progression/levels';
import { createRng, hashSeed } from '../rng';
import { POWER_UPS, POWER_UP_IDS, type PowerUpId, type Rarity } from './powerups';

export const RARITY_WEIGHTS: Record<1 | 2 | 3, Record<Rarity, number>> = {
  1: { common: 80, uncommon: 20, rare: 0, epic: 0 },
  2: { common: 60, uncommon: 30, rare: 10, epic: 0 },
  3: { common: 45, uncommon: 35, rare: 17, epic: 3 },
};

/** Each mini-game favours a couple of power-ups (docs/04 "theme bias"). */
export const GAME_BIAS: Record<MiniGameId, PowerUpId[]> = {
  connectLeashes: ['fetch', 'flashlight'],
  blockDrop: ['extraBone', 'fetch'],
  slidingPup: ['flashlight', 'sniff'],
  kibbleBlocks: ['fetch', 'extraBone'],
  memoryFetch: ['sniff', 'guideDog'],
  nonogramPaws: ['flashlight', 'fetch'],
  rushHour: ['extraBone', 'guideDog'],
  waterSort: ['sniff', 'guideDog'],
  lightsOut: ['flashlight', 'extraBone'],
  pipeSprinklers: ['fetch', 'flashlight'],
};

export const PITY_THRESHOLD = 4;

export const rollsForStars = (stars: number) => Math.max(0, Math.min(3, stars));

export interface BonusRewardInput {
  saveSeed: number;
  levelId: number;
  game: MiniGameId;
  previousStars: number;
  stars: number;
  pity: number;
}

export interface BonusReward {
  items: PowerUpId[];
  pity: number;
}

function rollItem(seed: number, stars: 1 | 2 | 3, game: MiniGameId | null, forced?: Rarity): PowerUpId {
  const rng = createRng(seed);
  const rarity: Rarity = forced ?? rng.weighted(Object.entries(RARITY_WEIGHTS[stars]) as [Rarity, number][]);
  const options = POWER_UP_IDS.filter((id) => POWER_UPS[id].rarity === rarity);
  const bias = game ? GAME_BIAS[game] : [];
  return rng.weighted(options.map((id) => [id, bias.includes(id) ? 3 : 1] as const));
}

/** World chest: opened once per world after all 25 levels are finished. */
export function rollChest(saveSeed: number, worldId: number, worldStars: number, maxStars: number): { items: PowerUpId[]; treats: number } {
  const ratio = maxStars > 0 ? worldStars / maxStars : 0;
  const count = 3 + (ratio >= 0.6 ? 1 : 0) + (ratio >= 1 ? 1 : 0);
  const tier: 1 | 2 | 3 = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
  const items = Array.from({ length: count }, (_, i) =>
    rollItem(hashSeed(saveSeed, 'chest', worldId, i), tier, null, i === 0 && tier === 3 ? 'rare' : undefined),
  );
  return { items, treats: 50 * worldId + Math.round(50 * ratio) };
}

/** Daily puzzle prize: one power-up, better with more stars. */
export function rollDailyItem(saveSeed: number, date: string, stars: number): PowerUpId {
  const s = Math.max(1, Math.min(3, stars)) as 1 | 2 | 3;
  return rollItem(hashSeed(saveSeed, 'daily', date), s, null);
}

/**
 * Deterministic bonus rewards. Only rolls that the new star count adds on top of
 * the previous best are granted, so replays can't farm rewards.
 */
export function rollBonusReward(input: BonusRewardInput): BonusReward {
  const stars = Math.max(1, Math.min(3, input.stars)) as 1 | 2 | 3;
  const from = rollsForStars(input.previousStars);
  const to = rollsForStars(stars);
  const items: PowerUpId[] = [];
  for (let i = from; i < to; i++) {
    const forced: Rarity | undefined = i === 0 && stars === 3 ? 'uncommon' : i === 0 && stars === 2 ? 'common' : undefined;
    items.push(rollItem(hashSeed(input.saveSeed, input.levelId, i), stars, input.game, forced));
  }
  if (!items.length) return { items, pity: input.pity };
  let pity = input.pity + 1;
  const hasRare = items.some((id) => POWER_UPS[id].rarity === 'rare' || POWER_UPS[id].rarity === 'epic');
  if (hasRare) {
    pity = 0;
  } else if (pity >= PITY_THRESHOLD) {
    items[items.length - 1] = 'sniff';
    pity = 0;
  }
  return { items, pity };
}
