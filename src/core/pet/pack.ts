/**
 * The pack: every dog you own (one entry per breed). Duplicates from the
 * Adoption Fair add copies that level the dog up; treats can train it too.
 * The Fair is a seeded gacha with open odds and a pity timer.
 */
import { createRng, hashSeed } from '../rng';
import { BREED_CATALOG, isBreedId, type DogRarity } from './breeds';

export interface PackDog {
  breed: string;
  /** Custom name; empty = use the breed name. */
  name: string;
  level: number;
  /** Duplicate copies collected towards the next level. */
  copies: number;
  /** Where the dog came from first. */
  source: 'starter' | 'story' | 'fair';
  adoptedAt: number;
}

export interface FairState {
  /** Total adoptions made (also the seed index, so refreshing cannot reroll). */
  pulls: number;
  /** Pulls since the last Rare-or-better dog. */
  sinceRare: number;
}

export const MAX_DOG_LEVEL = 10;
export const FAIR_PRICE = 100;
/** Pulling a dog that is already max level gives this many treats back. */
export const FAIR_REFUND = 50;
/** The 10th pull without a Rare+ is guaranteed Rare or better. */
export const FAIR_PITY = 10;

export const FAIR_ODDS: Record<DogRarity, number> = { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1 };
const RARITIES = Object.keys(FAIR_ODDS) as DogRarity[];
const RARE_PLUS: DogRarity[] = ['rare', 'epic', 'legendary'];

/** Guaranteed rescues when a world's chest is opened. */
export const STORY_DOGS: Record<number, { breed: string; story: string }> = {
  1: { breed: 'pug', story: 'Found snoring under a park bench, this little Pug decided you are its new favourite human.' },
  2: { breed: 'poodle', story: 'This Poodle got lost on its way to a dog show. Your yard is fancier anyway.' },
  3: { breed: 'samoyed', story: 'A fluffy Samoyed wandered out of the snow, smiling as always. It is staying for the treats.' },
  4: { breed: 'chow', story: 'A proud Chow Chow followed you home from the last walk. It pretends not to care, but it does.' },
  5: { breed: 'malamute', story: 'A Malamute pulled your sled out of a snowdrift and refused to leave. It has decided you need protecting.' },
};

export const emptyFair = (): FairState => ({ pulls: 0, sinceRare: 0 });

/** Copies needed to go from `level` to `level + 1`. */
export const copiesForLevel = (level: number) => level;

/** Treats to train a dog one level (grows with level and rarity). */
export function trainCost(rarity: DogRarity, level: number): number {
  const step = RARITIES.indexOf(rarity);
  return Math.round((80 * level * (1 + step * 0.5)) / 10) * 10;
}

export const newDog = (breed: string, source: PackDog['source'], now: number): PackDog => ({ breed, name: '', level: 1, copies: 0, source, adoptedAt: now });

/** Adds a dog (or a copy of one you already have). Returns the new pack and whether it levelled up. */
export function addToPack(pack: PackDog[], breed: string, source: PackDog['source'], now: number): { pack: PackDog[]; isNew: boolean; levelUp: boolean } {
  const i = pack.findIndex((d) => d.breed === breed);
  if (i < 0) return { pack: [...pack, newDog(breed, source, now)], isNew: true, levelUp: false };
  const dog = pack[i];
  if (dog.level >= MAX_DOG_LEVEL) return { pack, isNew: false, levelUp: false };
  let { level, copies } = dog;
  copies += 1;
  let levelUp = false;
  if (copies >= copiesForLevel(level)) {
    copies = 0;
    level += 1;
    levelUp = true;
  }
  const next = [...pack];
  next[i] = { ...dog, level, copies };
  return { pack: next, isNew: false, levelUp };
}

/** One seeded Fair roll. `pullIndex` is the save's total pull count before this pull. */
export function rollFair(saveSeed: number, fair: FairState): { breed: string; rarity: DogRarity; fair: FairState } {
  const rng = createRng(hashSeed(saveSeed, 'fair', fair.pulls));
  const pity = fair.sinceRare + 1 >= FAIR_PITY;
  const table = RARITIES.filter((r) => !pity || RARE_PLUS.includes(r)).map((r) => [r, FAIR_ODDS[r]] as const);
  const rarity = rng.weighted(table);
  const breed = rng.pick(BREED_CATALOG.filter((b) => b.rarity === rarity)).id;
  const rare = RARE_PLUS.includes(rarity);
  return { breed, rarity, fair: { pulls: fair.pulls + 1, sinceRare: rare ? 0 : fair.sinceRare + 1 } };
}

/** Odds as display percentages. */
export function fairOddsPercent(): [DogRarity, number][] {
  const total = RARITIES.reduce((s, r) => s + FAIR_ODDS[r], 0);
  return RARITIES.map((r) => [r, (FAIR_ODDS[r] / total) * 100]);
}

export function normalizePack(v: unknown, now: number): PackDog[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: PackDog[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const d = raw as Partial<PackDog>;
    if (!isBreedId(d.breed) || seen.has(d.breed)) continue;
    seen.add(d.breed);
    const level = Math.min(MAX_DOG_LEVEL, Math.max(1, Math.floor(Number(d.level) || 1)));
    out.push({
      breed: d.breed,
      name: typeof d.name === 'string' ? d.name.slice(0, 16) : '',
      level,
      copies: level >= MAX_DOG_LEVEL ? 0 : Math.max(0, Math.min(copiesForLevel(level) - 1, Math.floor(Number(d.copies) || 0))),
      source: d.source === 'story' || d.source === 'fair' ? d.source : 'starter',
      adoptedAt: typeof d.adoptedAt === 'number' && Number.isFinite(d.adoptedAt) ? d.adoptedAt : now,
    });
  }
  return out;
}

export function normalizeFair(v: unknown): FairState {
  const f = (v && typeof v === 'object' ? v : {}) as Partial<FairState>;
  const int = (n: unknown) => Math.max(0, Math.floor(typeof n === 'number' && Number.isFinite(n) ? n : 0));
  return { pulls: int(f.pulls), sinceRare: Math.min(FAIR_PITY - 1, int(f.sinceRare)) };
}
