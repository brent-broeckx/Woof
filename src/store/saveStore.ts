import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POWER_UPS, POWER_UP_IDS, type PowerUpId } from '../core/economy/powerups';
import { ACCESSORIES, BOARD_THEMES, cosmeticPrice, type AccessoryId } from '../core/economy/cosmetics';
import { rollBonusReward, rollChest, rollDailyItem } from '../core/economy/rewards';
import { applyDailyCompletion, emptyDaily, type DailyRecord } from '../core/progression/daily';
import { LEVELS_PER_WORLD, TOTAL_LEVELS, type MiniGameId } from '../core/progression/levels';
import { debugUnlockAll } from '../debug/debugStore';
import {
  cleanName,
  createPup,
  feedPup,
  FEED_COST,
  isFull,
  currentFullness,
  kibbleForBonus,
  kibbleForDaily,
  kibbleForEndless,
  kibbleForLevel,
  normalizePup,
  shiftPupTime,
  START_KIBBLE,
  WIN_XP,
  type PupState,
} from '../core/pet/pup';
import { breedById, isBreedId, type DogRarity } from '../core/pet/breeds';
import {
  addToPack,
  emptyFair,
  FAIR_PRICE,
  FAIR_REFUND,
  MAX_DOG_LEVEL,
  newDog,
  normalizeFair,
  normalizePack,
  rollFair,
  STORY_DOGS,
  trainCost,
  type FairState,
  type PackDog,
} from '../core/pet/pack';
import { collectJar, emptyYard, normalizeYard, packRate, settleYard, type Producer, type YardState } from '../core/pet/yard';
import { shiftLastSeen } from './lastSeen';
import type { GameState } from '../core/puzzle/game';

export interface Settings {
  autoCross: boolean;
  highlightDone: boolean;
  placementMode: 'x' | 'dog';
  showTimer: boolean;
  reducedMotion: boolean;
  sound: boolean;
  music: boolean;
  haptics: boolean;
  patterns: boolean;
  highContrast: boolean;
}

export interface LevelStats {
  attempts: number;
  wins: number;
  losses: number;
  mistakes: number;
  powerUps: number;
  totalMs: number;
}

export interface Totals {
  puzzlesSolved: number;
  mistakes: number;
  powerUpsUsed: number;
  bonusPlayed: number;
  dailySolved: number;
  endlessSolved: number;
  playMs: number;
}

export interface Cosmetics {
  owned: string[];
  boardTheme: string;
  accessory: AccessoryId;
}

export interface PuzzleOutcome {
  stars: number;
  timeMs: number;
  mistakes: number;
  powerUps: number;
}

export interface LevelProgress {
  stars: number;
  bestTimeMs?: number;
}

export interface SaveData {
  version: 1;
  seed: number;
  progress: Record<number, LevelProgress>;
  inventory: Record<PowerUpId, number>;
  treats: number;
  pity: number;
  settings: Settings;
  inProgress: GameState | null;
  seenTips: Record<string, boolean>;
  cosmetics: Cosmetics;
  chests: Record<number, boolean>;
  daily: DailyRecord;
  stats: { levels: Record<number, LevelStats>; totals: Totals };
  /** The main pup; null until the player adopts one. */
  pup: PupState | null;
  /** Food currency earned by playing. */
  kibble: number;
  /** Treat jar filled over time by the pack. */
  yard: YardState;
  /** Every dog you own, one entry per breed (the main pup's breed included). */
  pack: PackDog[];
  fair: FairState;
}

export interface AdoptionResult {
  breed: string;
  rarity: DogRarity;
  isNew: boolean;
  levelUp: boolean;
  level: number;
  /** Treats returned when the dog was already max level. */
  refund: number;
}

interface SaveActions {
  completePuzzle(levelId: number, outcome: PuzzleOutcome): { kibble: number; improved: boolean };
  recordAttempt(levelId: number): void;
  recordLoss(levelId: number): void;
  completeDaily(date: string, outcome: PuzzleOutcome): { kibble: number; item: PowerUpId | null; streak: number; firstTime: boolean };
  completeEndless(size: number, outcome: PuzzleOutcome): { kibble: number };
  openChest(worldId: number): { items: PowerUpId[]; treats: number; rescued: AdoptionResult | null } | null;
  buyCosmetic(id: string): boolean;
  equipTheme(id: string): void;
  equipAccessory(id: AccessoryId): void;
  completeBonus(levelId: number, game: MiniGameId, stars: number): { items: PowerUpId[]; kibble: number };
  adoptPup(name: string, breed: string): void;
  /** Spend kibble on one bowl. Fails if broke, full or no pup. */
  feedPup(): boolean;
  renamePup(name: string): void;
  /** Empties the treat jar into your wallet; returns the amount. */
  collectTreats(): number;
  /** One Adoption Fair pull; null if you cannot afford it. */
  adoptFromFair(): AdoptionResult | null;
  /** Spend treats to level a pack dog up. */
  trainDog(breed: string): boolean;
  renameDog(breed: string, name: string): void;
  debugTimeTravel(ms: number): void;
  debugAddKibble(n: number): void;
  consumePowerUp(id: PowerUpId): boolean;
  buyPowerUp(id: PowerUpId): boolean;
  updateSettings(patch: Partial<Settings>): void;
  saveInProgress(state: GameState | null): void;
  markTip(id: string): void;
  resetAll(): void;
  importSave(json: string): boolean;
}

const emptyInventory = () => Object.fromEntries(POWER_UP_IDS.map((id) => [id, 0])) as Record<PowerUpId, number>;

export const DEFAULT_SETTINGS: Settings = {
  autoCross: true,
  highlightDone: true,
  placementMode: 'x',
  showTimer: true,
  reducedMotion: false,
  sound: true,
  music: false,
  haptics: true,
  patterns: false,
  highContrast: false,
};

const emptyTotals = (): Totals => ({ puzzlesSolved: 0, mistakes: 0, powerUpsUsed: 0, bonusPlayed: 0, dailySolved: 0, endlessSolved: 0, playMs: 0 });
const emptyLevelStats = (): LevelStats => ({ attempts: 0, wins: 0, losses: 0, mistakes: 0, powerUps: 0, totalMs: 0 });
const defaultCosmetics = (): Cosmetics => ({ owned: ['classic', 'none'], boardTheme: 'classic', accessory: 'none' });

/** Add a finished puzzle to the running totals. */
function addTotals(t: Totals, o: PuzzleOutcome, patch: Partial<Totals> = {}): Totals {
  const next = { ...t, mistakes: t.mistakes + o.mistakes, powerUpsUsed: t.powerUpsUsed + o.powerUps, playMs: t.playMs + o.timeMs };
  for (const [k, v] of Object.entries(patch) as [keyof Totals, number][]) next[k] += v;
  return next;
}

const freshSave = (): SaveData => ({
  version: 1,
  seed: Math.floor(Math.random() * 2 ** 31),
  progress: {},
  inventory: { ...emptyInventory(), extraBone: 1, fetch: 1 },
  treats: 0,
  pity: 0,
  settings: { ...DEFAULT_SETTINGS },
  inProgress: null,
  seenTips: {},
  cosmetics: defaultCosmetics(),
  chests: {},
  daily: emptyDaily(),
  stats: { levels: {}, totals: emptyTotals() },
  pup: null,
  kibble: START_KIBBLE,
  yard: emptyYard(Date.now()),
  pack: [],
  fair: emptyFair(),
});

/** The persisted part of the store (shared by persist and export). */
function pickSave(s: SaveData): SaveData {
  return {
    version: 1,
    seed: s.seed,
    progress: s.progress,
    inventory: s.inventory,
    treats: s.treats,
    pity: s.pity,
    settings: s.settings,
    inProgress: s.inProgress,
    seenTips: s.seenTips,
    cosmetics: s.cosmetics,
    chests: s.chests,
    daily: s.daily,
    stats: s.stats,
    pup: s.pup,
    kibble: s.kibble,
    yard: s.yard,
    pack: s.pack,
    fair: s.fair,
  };
}

/** Small bond boost for the pup when you win anything. */
const winBond = (pup: PupState | null) => (pup ? { ...pup, bondXp: pup.bondXp + WIN_XP } : pup);

/** The dogs producing treats in the yard: the whole pack, main pup first. */
export function yardPack(s: Pick<SaveData, 'pup' | 'pack'>): Producer[] {
  if (!s.pup) return [];
  const main = s.pup.breed;
  const pack = s.pack.some((d) => d.breed === main) ? s.pack : [newDog(main, 'starter', 0), ...s.pack];
  return [...pack].sort((a, b) => Number(b.breed === main) - Number(a.breed === main)).map((d) => ({ breed: d.breed, level: d.level }));
}

/** Display name of a pack dog (the main pup uses its own name). */
export function dogName(s: Pick<SaveData, 'pup'>, dog: Pick<PackDog, 'breed' | 'name'>): string {
  if (s.pup && s.pup.breed === dog.breed) return s.pup.name;
  return dog.name || breedById(dog.breed).name;
}

/** Makes sure the main pup and every opened world's story dog are in the pack. */
function ensurePack(pack: PackDog[], pup: PupState | null, chests: Record<number, boolean>, now: number): PackDog[] {
  let next = pack;
  if (pup && !next.some((d) => d.breed === pup.breed)) next = [newDog(pup.breed, 'starter', pup.adoptedAt), ...next];
  for (const [world, dog] of Object.entries(STORY_DOGS)) {
    if (chests[Number(world)] && !next.some((d) => d.breed === dog.breed)) next = [...next, newDog(dog.breed, 'story', now)];
  }
  return next;
}

/** The yard brought up to `now` (pure; does not save). */
export function liveYard(s: Pick<SaveData, 'pup' | 'pack' | 'yard'>, now: number): YardState {
  return settleYard(s.yard, packRate(yardPack(s)), s.pup, now);
}

/** Keeps only power-ups that still exist; removed ones are dropped silently. */
export function sanitizeInventory(raw: Partial<Record<string, number>> | undefined): Record<PowerUpId, number> {
  const inv = emptyInventory();
  for (const id of POWER_UP_IDS) {
    const n = raw?.[id];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) inv[id] = Math.floor(n);
  }
  return inv;
}

/** Fill in fields added in later versions of the game. */
function mergeNested(p: Partial<SaveData>) {
  return {
    inventory: sanitizeInventory(p.inventory),
    settings: { ...DEFAULT_SETTINGS, ...p.settings },
    cosmetics: { ...defaultCosmetics(), ...p.cosmetics },
    chests: { ...p.chests },
    daily: { ...emptyDaily(), ...p.daily },
    stats: { levels: { ...p.stats?.levels }, totals: { ...emptyTotals(), ...p.stats?.totals } },
    pup: normalizePup(p.pup, Date.now()),
    kibble: typeof p.kibble === 'number' && Number.isFinite(p.kibble) ? Math.max(0, Math.floor(p.kibble)) : START_KIBBLE,
    yard: normalizeYard(p.yard, Date.now()),
    pack: ensurePack(normalizePack(p.pack, Date.now()), normalizePup(p.pup, Date.now()), { ...p.chests }, Date.now()),
    fair: normalizeFair(p.fair),
  };
}

export const useSave = create<SaveData & SaveActions>()(
  persist(
    (set, get) => ({
      ...freshSave(),

      completePuzzle(levelId, outcome) {
        const { stars, timeMs } = outcome;
        const prev = get().progress[levelId];
        const kibble = kibbleForLevel(stars, !prev);
        set((s) => {
          const ls = s.stats.levels[levelId] ?? emptyLevelStats();
          return {
            kibble: s.kibble + kibble,
            pup: winBond(s.pup),
            inProgress: null,
            stats: {
              levels: {
                ...s.stats.levels,
                [levelId]: {
                  ...ls,
                  wins: ls.wins + 1,
                  mistakes: ls.mistakes + outcome.mistakes,
                  powerUps: ls.powerUps + outcome.powerUps,
                  totalMs: ls.totalMs + timeMs,
                },
              },
              totals: addTotals(s.stats.totals, outcome, { puzzlesSolved: 1 }),
            },
            progress: {
              ...s.progress,
              [levelId]: {
                stars: Math.max(prev?.stars ?? 0, stars),
                bestTimeMs: Math.min(prev?.bestTimeMs ?? Infinity, timeMs),
              },
            },
          };
        });
        return { kibble, improved: stars > (prev?.stars ?? 0) };
      },

      recordAttempt(levelId) {
        set((s) => {
          const ls = s.stats.levels[levelId] ?? emptyLevelStats();
          return { stats: { ...s.stats, levels: { ...s.stats.levels, [levelId]: { ...ls, attempts: ls.attempts + 1 } } } };
        });
      },

      recordLoss(levelId) {
        set((s) => {
          const ls = s.stats.levels[levelId] ?? emptyLevelStats();
          return { stats: { ...s.stats, levels: { ...s.stats.levels, [levelId]: { ...ls, losses: ls.losses + 1 } } } };
        });
      },

      completeDaily(date, outcome) {
        const s = get();
        const { record, firstTime } = applyDailyCompletion(s.daily, date, outcome.stars);
        const item = firstTime ? rollDailyItem(s.seed, date, outcome.stars) : null;
        const kibble = kibbleForDaily(record.streak, firstTime);
        set({
          daily: record,
          kibble: s.kibble + kibble,
          pup: winBond(s.pup),
          inventory: item ? { ...s.inventory, [item]: s.inventory[item] + 1 } : s.inventory,
          stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome, { dailySolved: firstTime ? 1 : 0 }) },
        });
        return { kibble, item, streak: record.streak, firstTime };
      },

      completeEndless(size, outcome) {
        const kibble = kibbleForEndless(size, outcome.stars);
        set((s) => ({
          kibble: s.kibble + kibble,
          pup: winBond(s.pup),
          stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome, { endlessSolved: 1 }) },
        }));
        return { kibble };
      },

      openChest(worldId) {
        const s = get();
        if (s.chests[worldId]) return null;
        const first = (worldId - 1) * LEVELS_PER_WORLD + 1;
        let stars = 0;
        for (let id = first; id < first + LEVELS_PER_WORLD; id++) {
          if (!s.progress[id]) return null;
          stars += s.progress[id].stars;
        }
        const reward = rollChest(s.seed, worldId, stars, LEVELS_PER_WORLD * 3);
        const inventory = { ...s.inventory };
        for (const id of reward.items) inventory[id]++;
        const now = Date.now();
        const story = STORY_DOGS[worldId];
        let rescued: AdoptionResult | null = null;
        let pack = s.pack;
        if (story) {
          const r = addToPack(s.pack, story.breed, 'story', now);
          pack = r.pack;
          const level = pack.find((d) => d.breed === story.breed)?.level ?? 1;
          rescued = { breed: story.breed, rarity: breedById(story.breed).rarity, isNew: r.isNew, levelUp: r.levelUp, level, refund: 0 };
        }
        set({ inventory, treats: s.treats + reward.treats, chests: { ...s.chests, [worldId]: true }, yard: liveYard(s, now), pack });
        return { ...reward, rescued };
      },

      buyCosmetic(id) {
        const s = get();
        const price = cosmeticPrice(id);
        if (s.cosmetics.owned.includes(id) || s.treats < price) return false;
        set({ treats: s.treats - price, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, id] } });
        return true;
      },

      equipTheme(id) {
        if (!get().cosmetics.owned.includes(id) || !BOARD_THEMES.some((t) => t.id === id)) return;
        set((s) => ({ cosmetics: { ...s.cosmetics, boardTheme: id } }));
      },

      equipAccessory(id) {
        if (!get().cosmetics.owned.includes(id) || !ACCESSORIES.some((a) => a.id === id)) return;
        set((s) => ({ cosmetics: { ...s.cosmetics, accessory: id } }));
      },

      completeBonus(levelId, game, stars) {
        const s = get();
        const prevStars = s.progress[levelId]?.stars ?? 0;
        const effective = Math.max(1, stars);
        const reward = rollBonusReward({ saveSeed: s.seed, levelId, game, previousStars: prevStars, stars: effective, pity: s.pity });
        const inventory = { ...s.inventory };
        for (const id of reward.items) inventory[id]++;
        const kibble = kibbleForBonus(effective, prevStars === 0);
        set({
          inventory,
          kibble: s.kibble + kibble,
          pup: winBond(s.pup),
          pity: reward.pity,
          stats: { ...s.stats, totals: { ...s.stats.totals, bonusPlayed: s.stats.totals.bonusPlayed + 1 } },
          progress: { ...s.progress, [levelId]: { stars: Math.max(prevStars, effective) } },
        });
        return { items: reward.items, kibble };
      },

      adoptPup(name, breed) {
        if (get().pup || !isBreedId(breed)) return;
        const now = Date.now();
        const pup = createPup(name, breed, now);
        set((s) => ({ pup, yard: { ...emptyYard(now), collected: s.yard.collected }, pack: ensurePack(s.pack, pup, s.chests, now) }));
      },

      feedPup() {
        const s = get();
        const now = Date.now();
        if (!s.pup || s.kibble < FEED_COST || isFull(currentFullness(s.pup, now))) return false;
        // Bank production at the old mood before the multiplier changes.
        set({ kibble: s.kibble - FEED_COST, yard: liveYard(s, now), pup: feedPup(s.pup, now) });
        return true;
      },

      renamePup(name) {
        const clean = cleanName(name);
        if (!clean) return;
        set((s) => (s.pup ? { pup: { ...s.pup, name: clean } } : {}));
      },

      collectTreats() {
        const s = get();
        if (!s.pup) return 0;
        const { yard, amount } = collectJar(liveYard(s, Date.now()));
        set({ yard, treats: s.treats + amount });
        return amount;
      },

      adoptFromFair() {
        const s = get();
        if (!s.pup || s.treats < FAIR_PRICE) return null;
        const now = Date.now();
        const roll = rollFair(s.seed, s.fair);
        const r = addToPack(s.pack, roll.breed, 'fair', now);
        const level = r.pack.find((d) => d.breed === roll.breed)?.level ?? 1;
        const refund = r.pack === s.pack ? FAIR_REFUND : 0;
        // Bank production at the old rate before the pack changes.
        set({ treats: s.treats - FAIR_PRICE + refund, fair: roll.fair, yard: liveYard(s, now), pack: r.pack });
        return { breed: roll.breed, rarity: roll.rarity, isNew: r.isNew, levelUp: r.levelUp, level, refund };
      },

      trainDog(breed) {
        const s = get();
        const i = s.pack.findIndex((d) => d.breed === breed);
        if (i < 0) return false;
        const dog = s.pack[i];
        const cost = trainCost(breedById(breed).rarity, dog.level);
        if (dog.level >= MAX_DOG_LEVEL || s.treats < cost) return false;
        const pack = [...s.pack];
        pack[i] = { ...dog, level: dog.level + 1 };
        set({ treats: s.treats - cost, yard: liveYard(s, Date.now()), pack });
        return true;
      },

      renameDog(breed, name) {
        const clean = name.trim() ? cleanName(name) : '';
        if (get().pup?.breed === breed) {
          if (clean) get().renamePup(clean);
          return;
        }
        set((s) => ({ pack: s.pack.map((d) => (d.breed === breed ? { ...d, name: clean } : d)) }));
      },

      debugTimeTravel(ms) {
        shiftLastSeen(ms);
        set((s) => ({ yard: { ...s.yard, settledAt: s.yard.settledAt - ms }, pup: s.pup ? shiftPupTime(s.pup, ms) : s.pup }));
      },

      debugAddKibble(n) {
        set((s) => ({ kibble: s.kibble + n }));
      },

      consumePowerUp(id) {
        if (get().inventory[id] <= 0) return false;
        set((s) => ({ inventory: { ...s.inventory, [id]: s.inventory[id] - 1 } }));
        return true;
      },

      buyPowerUp(id) {
        const price = POWER_UPS[id].price;
        if (get().treats < price) return false;
        set((s) => ({ treats: s.treats - price, inventory: { ...s.inventory, [id]: s.inventory[id] + 1 } }));
        return true;
      },

      updateSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      saveInProgress(state) {
        set({ inProgress: state && state.status === 'playing' ? { ...state, history: [], event: null, hint: null } : null });
      },

      markTip(id) {
        set((s) => ({ seenTips: { ...s.seenTips, [id]: true } }));
      },

      resetAll() {
        set(freshSave());
      },

      importSave(json) {
        try {
          const data = JSON.parse(json) as SaveData;
          if (data.version !== 1 || typeof data.progress !== 'object') return false;
          set({ ...freshSave(), ...data, ...mergeNested(data) });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'woofdoku-save',
      version: 1,
      partialize: (s) => pickSave(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SaveData>;
        return {
          ...current,
          ...p,
          ...mergeNested(p),
          inventory: p.inventory ? sanitizeInventory(p.inventory) : current.inventory,
        };
      },
    },
  ),
);

/** The first level the player has not finished yet. */
export function nextUnplayed(progress: Record<number, LevelProgress>): number {
  let id = 1;
  while (progress[id]) id++;
  return id;
}

export function highestUnlocked(progress: Record<number, LevelProgress>): number {
  return debugUnlockAll() ? TOTAL_LEVELS : nextUnplayed(progress);
}

export function exportSave(): string {
  return JSON.stringify(pickSave(useSave.getState()));
}
