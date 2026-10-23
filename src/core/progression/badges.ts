import { BREED_CATALOG, breedById } from '../pet/breeds';
import { DESTINATIONS } from '../pet/expeditions';
import { bondLevel, MAX_BOND } from '../pet/pup';
import { medalCounts, ARCADE_SLOTS, type ArcadeState } from './arcade';
import { cafeCleared, cafePerfect, type CafeState } from './catCafe';
import { bossesCleared, bossesFlawless, type BossState } from './boss';
import { getLevel, TOTAL_LEVELS, WORLDS } from './levels';

/** Everything badges look at; built from the save. */
export interface BadgeInput {
  progress: Record<number, { stars: number }>;
  totals: { puzzlesSolved: number; dailySolved: number; endlessSolved: number; bonusPlayed: number; flawless: number };
  dailyBest: number;
  chests: Record<number, boolean>;
  arcade: ArcadeState;
  album: Record<string, number>;
  pack: { breed: string }[];
  bondXp: number;
  boss: BossState;
  cafe: CafeState;
}

export interface BadgeReward {
  kibble: number;
  treats: number;
  /** Badge-only cosmetic (looks only). */
  cosmetic?: string;
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  /** Describes the goal of a tier, e.g. "Solve 100 puzzles". */
  goal(n: number): string;
  /** Thresholds per tier (bronze, silver, gold; some badges have fewer). */
  tiers: number[];
  /** Cosmetics given with a tier (index = tier - 1). */
  cosmetics?: (string | undefined)[];
  metric(s: BadgeInput): number;
}

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold'] as const;
export const TIER_ICONS = ['🥉', '🥈', '🥇'] as const;
const TIER_REWARDS: Omit<BadgeReward, 'cosmetic'>[] = [
  { kibble: 10, treats: 50 },
  { kibble: 25, treats: 150 },
  { kibble: 50, treats: 300 },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const isPuzzleLevel = (id: number) => id >= 1 && id <= TOTAL_LEVELS && getLevel(id).kind === 'puzzle';
const postcardTotal = DESTINATIONS.reduce((n, d) => n + d.postcards.length, 0);
const legendaryTotal = BREED_CATALOG.filter((b) => b.rarity === 'legendary').length;

export const BADGES: BadgeDef[] = [
  {
    id: 'solver',
    name: 'Puzzle Pro',
    icon: '🧩',
    goal: (n) => `Solve ${plural(n, 'puzzle')} in any mode`,
    tiers: [10, 100, 500],
    metric: (s) => s.totals.puzzlesSolved + s.totals.dailySolved + s.totals.endlessSolved,
  },
  {
    id: 'flawless',
    name: 'Flawless Paws',
    icon: '✨',
    goal: (n) => `Solve ${plural(n, 'puzzle')} with no mistakes and no power-ups`,
    tiers: [5, 20, 50],
    cosmetics: [undefined, undefined, 'medal'],
    // Older saves didn't count flawless solves; 3★ levels are flawless by definition.
    metric: (s) => Math.max(s.totals.flawless, Object.entries(s.progress).filter(([id, p]) => p.stars >= 3 && isPuzzleLevel(Number(id))).length),
  },
  {
    id: 'streak',
    name: 'Daily Devotee',
    icon: '🔥',
    goal: (n) => `Reach a ${n}-day Daily Walk streak`,
    tiers: [3, 7, 30],
    cosmetics: [undefined, undefined, 'laurel'],
    metric: (s) => s.dailyBest,
  },
  {
    id: 'stars',
    name: 'Star Gazer',
    icon: '⭐',
    goal: (n) => `Collect ${plural(n, 'star')} on the world map`,
    tiers: [30, 150, TOTAL_LEVELS * 3],
    metric: (s) => Object.entries(s.progress).reduce((a, [id, p]) => a + (Number(id) <= TOTAL_LEVELS ? p.stars : 0), 0),
  },
  {
    id: 'worlds',
    name: 'World Walker',
    icon: '🗺️',
    goal: (n) => `Open ${plural(n, 'world chest')}`,
    tiers: [1, 2, WORLDS.length],
    metric: (s) => Object.values(s.chests).filter(Boolean).length,
  },
  {
    id: 'parks',
    name: 'Park Regular',
    icon: '🎁',
    goal: (n) => `Play ${plural(n, 'Bonus Park game')}`,
    tiers: [5, 25, 100],
    metric: (s) => s.totals.bonusPlayed,
  },
  {
    id: 'arcade',
    name: 'Arcade Ace',
    icon: '🕹️',
    goal: (n) => (n >= ARCADE_SLOTS ? 'Earn every Arcade gold medal' : `Earn ${plural(n, 'Arcade gold medal')}`),
    tiers: [1, 10, ARCADE_SLOTS],
    cosmetics: [undefined, undefined, 'trophy'],
    metric: (s) => medalCounts(s.arcade).gold,
  },
  {
    id: 'pack',
    name: 'Pack Leader',
    icon: '🐕',
    goal: (n) => `Have ${plural(n, 'dog')} in your pack`,
    tiers: [3, 10, BREED_CATALOG.length],
    metric: (s) => s.pack.length,
  },
  {
    id: 'legend',
    name: 'Living Legend',
    icon: '🌟',
    goal: (n) => (n >= legendaryTotal ? 'Own every Legendary dog' : `Own ${plural(n, 'Legendary dog')}`),
    tiers: [1, legendaryTotal],
    metric: (s) => s.pack.filter((d) => breedById(d.breed).rarity === 'legendary').length,
  },
  {
    id: 'postcards',
    name: 'Globetrotter',
    icon: '📮',
    goal: (n) => (n >= postcardTotal ? 'Fill the whole postcard album' : `Collect ${plural(n, 'postcard')}`),
    tiers: [6, Math.ceil(postcardTotal / 2), postcardTotal],
    metric: (s) => Object.values(s.album).filter((n) => n > 0).length,
  },
  {
    id: 'bond',
    name: 'Best Friends',
    icon: '💞',
    goal: (n) => `Reach bond level ${n} with your pup`,
    tiers: [3, 6, MAX_BOND],
    metric: (s) => bondLevel(s.bondXp).level,
  },
  {
    id: 'boss',
    name: 'Boss Buster',
    icon: '🏔️',
    goal: (n) => `Beat ${plural(n, 'weekly boss', 'weekly bosses')}`,
    tiers: [1, 4, 12],
    metric: (s) => bossesCleared(s.boss),
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    icon: '🛡️',
    goal: (n) => `Beat ${plural(n, 'weekly boss', 'weekly bosses')} with no mistakes and no power-ups`,
    tiers: [1, 5],
    cosmetics: ['cape'],
    metric: (s) => bossesFlawless(s.boss),
  },
  {
    id: 'cats',
    name: 'Cat Whisperer',
    icon: '🐈',
    goal: (n) => `Clear ${plural(n, 'Cat Café level', 'Cat Café levels')}`,
    tiers: [5, 15, 30],
    cosmetics: [undefined, undefined, 'catEars'],
    metric: (s) => cafeCleared(s.cafe),
  },
  {
    id: 'purrfect',
    name: 'Purrfect',
    icon: '😸',
    goal: (n) => `Get 3 stars on ${plural(n, 'Cat Café level', 'Cat Café levels')}`,
    tiers: [3, 10, 30],
    metric: (s) => cafePerfect(s.cafe),
  },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);

/** Which badge gives a cosmetic, if any. */
export function badgeForCosmetic(cosmetic: string): { badge: BadgeDef; tier: number } | null {
  for (const badge of BADGES) {
    const i = badge.cosmetics?.indexOf(cosmetic) ?? -1;
    if (i >= 0) return { badge, tier: i + 1 };
  }
  return null;
}

export function tierReward(badge: BadgeDef, tier: number): BadgeReward {
  return { ...TIER_REWARDS[Math.min(tier, TIER_REWARDS.length) - 1], cosmetic: badge.cosmetics?.[tier - 1] };
}

export interface BadgeStatus {
  badge: BadgeDef;
  value: number;
  /** Tiers reached. */
  earned: number;
  /** Tiers whose reward was collected. */
  claimed: number;
  /** Next threshold to aim for, or null when every tier is earned. */
  next: number | null;
}

export function badgeStatus(badge: BadgeDef, input: BadgeInput, claimed: Record<string, number>): BadgeStatus {
  const value = Math.max(0, badge.metric(input));
  const earned = badge.tiers.filter((t) => value >= t).length;
  return { badge, value, earned, claimed: Math.min(earned, claimed[badge.id] ?? 0), next: badge.tiers[earned] ?? null };
}

export const allBadgeStatus = (input: BadgeInput, claimed: Record<string, number>) => BADGES.map((b) => badgeStatus(b, input, claimed));

export const claimableCount = (input: BadgeInput, claimed: Record<string, number>) =>
  allBadgeStatus(input, claimed).reduce((n, s) => n + (s.earned - s.claimed), 0);

/** Rewards for every earned-but-unclaimed tier of a badge. */
export function pendingRewards(status: BadgeStatus): BadgeReward[] {
  const out: BadgeReward[] = [];
  for (let tier = status.claimed + 1; tier <= status.earned; tier++) out.push(tierReward(status.badge, tier));
  return out;
}

export function normalizeBadges(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [id, n] of Object.entries(v)) {
    const badge = badgeById(id);
    if (badge && typeof n === 'number' && n > 0) out[id] = Math.min(badge.tiers.length, Math.floor(n));
  }
  return out;
}
