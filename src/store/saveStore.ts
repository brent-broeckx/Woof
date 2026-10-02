import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POWER_UPS, POWER_UP_IDS, type PowerUpId } from '../core/economy/powerups';
import { ACCESSORIES, BOARD_THEMES, cosmeticPrice, type AccessoryId } from '../core/economy/cosmetics';
import { DECOR_SLOTS, decorUnlocked, defaultLayout, normalizeLayout, type DecorLayout } from '../core/economy/decor';
import { rollBonusReward, rollChest, rollDailyItem } from '../core/economy/rewards';
import { applyDailyCompletion, dateKey, emptyDaily, type DailyRecord } from '../core/progression/daily';
import { emptyArcade, normalizeArcade, recordArcadeRun, type ArcadeDifficulty, type ArcadeRun, type ArcadeState } from '../core/progression/arcade';
import { allBadgeStatus, normalizeBadges, pendingRewards, type BadgeInput, type BadgeReward } from '../core/progression/badges';
import { applyCafeCompletion, emptyCafe, normalizeCafe, type CafeResult, type CafeState } from '../core/progression/catCafe';
import { applyBossCompletion, emptyBoss, normalizeBoss, type BossResult, type BossState } from '../core/progression/boss';
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
import {
  awayDogs,
  claimExpedition,
  destinationById,
  destinationUnlocked,
  emptyExpeditions,
  normalizeExpeditions,
  recallExpedition,
  SET_REWARD,
  shiftExpeditions,
  startExpedition,
  type ExpeditionLoot,
  type ExpeditionState,
} from '../core/pet/expeditions';
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
  /** Puzzles solved with no mistakes and no power-ups (any mode). */
  flawless: number;
}

export interface Cosmetics {
  owned: string[];
  boardTheme: string;
  accessory: AccessoryId;
  /** Decor item per yard grid slot (row by row). */
  decor: DecorLayout;
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
  expeditions: ExpeditionState;
  arcade: ArcadeState;
  boss: BossState;
  /** 🐈 Cat Café twist levels. */
  cafe: CafeState;
  /** Badge id -> tiers whose reward was collected. */
  badges: Record<string, number>;
}

export interface ExpeditionClaim {
  loot: ExpeditionLoot;
  newPostcard: boolean;
  duplicateTreats: number;
  /** Destination whose postcard set was just finished (its reward is included). */
  completedSet: string | null;
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
  /** Puts an unlocked decor item in a yard slot (null clears it). */
  placeDecor(slot: number, id: string | null): boolean;
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
  /** Sends pack dogs (not the main pup) on a trip. */
  sendExpedition(destination: string, hours: number, breeds: string[]): boolean;
  claimExpedition(tripId: number): ExpeditionClaim | null;
  recallExpedition(tripId: number): void;
  /** Records an Arcade run: kibble (daily-capped) and personal bests. No power-ups. */
  completeArcade(game: MiniGameId, difficulty: ArcadeDifficulty, stars: number, timeMs: number): Omit<ArcadeRun, 'state'>;
  /** Records a weekly boss win: big first-clear reward, extra for the first flawless run. */
  completeBoss(week: string, outcome: PuzzleOutcome): Omit<BossResult, 'state'>;
  /** Records a Cat Café win. */
  completeCafe(level: number, outcome: PuzzleOutcome): Omit<CafeResult, 'state'>;
  /** Collects every earned tier of a badge; null if nothing to claim. */
  claimBadge(id: string): BadgeReward[] | null;
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

const emptyTotals = (): Totals => ({
  puzzlesSolved: 0,
  mistakes: 0,
  powerUpsUsed: 0,
  bonusPlayed: 0,
  dailySolved: 0,
  endlessSolved: 0,
  playMs: 0,
  flawless: 0,
});
const emptyLevelStats = (): LevelStats => ({ attempts: 0, wins: 0, losses: 0, mistakes: 0, powerUps: 0, totalMs: 0 });
const defaultCosmetics = (): Cosmetics => ({ owned: ['classic', 'none'], boardTheme: 'classic', accessory: 'none', decor: defaultLayout() });

/** Add a finished puzzle to the running totals. */
function addTotals(t: Totals, o: PuzzleOutcome, patch: Partial<Totals> = {}): Totals {
  const next = {
    ...t,
    mistakes: t.mistakes + o.mistakes,
    powerUpsUsed: t.powerUpsUsed + o.powerUps,
    playMs: t.playMs + o.timeMs,
    flawless: t.flawless + (o.mistakes === 0 && o.powerUps === 0 ? 1 : 0),
  };
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
  expeditions: emptyExpeditions(),
  arcade: emptyArcade(),
  boss: emptyBoss(),
  cafe: emptyCafe(),
  badges: {},
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
    expeditions: s.expeditions,
    arcade: s.arcade,
    boss: s.boss,
    cafe: s.cafe,
    badges: s.badges,
  };
}

/** Small bond boost for the pup when you win anything. */
const winBond = (pup: PupState | null) => (pup ? { ...pup, bondXp: pup.bondXp + WIN_XP } : pup);

type YardSource = Pick<SaveData, 'pup' | 'pack'> & Partial<Pick<SaveData, 'expeditions'>>;

/** The dogs producing treats in the yard: the pack minus dogs on a trip, main pup first. */
export function yardPack(s: YardSource): Producer[] {
  if (!s.pup) return [];
  const main = s.pup.breed;
  const away = s.expeditions ? awayDogs(s.expeditions) : new Set<string>();
  const pack = (s.pack.some((d) => d.breed === main) ? s.pack : [newDog(main, 'starter', 0), ...s.pack]).filter((d) => d.breed === main || !away.has(d.breed));
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
export function liveYard(s: YardSource & Pick<SaveData, 'yard'>, now: number): YardState {
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
  const pup = normalizePup(p.pup, Date.now());
  const pack = ensurePack(normalizePack(p.pack, Date.now()), pup, { ...p.chests }, Date.now());
  return {
    inventory: sanitizeInventory(p.inventory),
    settings: { ...DEFAULT_SETTINGS, ...p.settings },
    cosmetics: { ...defaultCosmetics(), ...p.cosmetics, decor: normalizeLayout(p.cosmetics?.decor) },
    chests: { ...p.chests },
    daily: { ...emptyDaily(), ...p.daily },
    stats: { levels: { ...p.stats?.levels }, totals: { ...emptyTotals(), ...p.stats?.totals } },
    pup,
    kibble: typeof p.kibble === 'number' && Number.isFinite(p.kibble) ? Math.max(0, Math.floor(p.kibble)) : START_KIBBLE,
    yard: normalizeYard(p.yard, Date.now()),
    pack,
    fair: normalizeFair(p.fair),
    expeditions: normalizeExpeditions(p.expeditions, new Set(pack.filter((d) => d.breed !== pup?.breed).map((d) => d.breed))),
    arcade: normalizeArcade(p.arcade),
    boss: normalizeBoss(p.boss),
    cafe: normalizeCafe(p.cafe),
    badges: normalizeBadges(p.badges),
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

      placeDecor(slot, id) {
        const s = get();
        if (!Number.isInteger(slot) || slot < 0 || slot >= DECOR_SLOTS) return false;
        if (id !== null && !decorUnlocked(id, s.cosmetics.owned, s.chests)) return false;
        const decor = [...s.cosmetics.decor];
        decor[slot] = id;
        set({ cosmetics: { ...s.cosmetics, decor } });
        return true;
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

      sendExpedition(destination, hours, breeds) {
        const s = get();
        const dest = destinationById(destination);
        if (!s.pup || !dest || !destinationUnlocked(dest, highestUnlocked(s.progress), LEVELS_PER_WORLD)) return false;
        const team: Producer[] = [];
        for (const breed of breeds) {
          const dog = s.pack.find((d) => d.breed === breed);
          if (!dog || breed === s.pup.breed) return false;
          team.push({ breed, level: dog.level });
        }
        const now = Date.now();
        const expeditions = startExpedition(s.expeditions, s.seed, team, destination, hours, now);
        if (!expeditions) return false;
        // Bank production while the team is still home.
        set({ yard: liveYard(s, now), expeditions });
        return true;
      },

      claimExpedition(tripId) {
        const s = get();
        const now = Date.now();
        const r = claimExpedition(s.expeditions, tripId, now);
        if (!r) return null;
        const { loot } = r;
        const inventory = { ...s.inventory };
        for (const id of loot.items) inventory[id]++;
        const set_ = r.completedSet ? SET_REWARD : { treats: 0, kibble: 0 };
        set({
          yard: liveYard(s, now),
          expeditions: r.state,
          inventory,
          treats: s.treats + loot.treats + r.duplicateTreats + set_.treats,
          kibble: s.kibble + loot.kibble + set_.kibble,
        });
        return { loot, newPostcard: r.newPostcard, duplicateTreats: r.duplicateTreats, completedSet: r.completedSet };
      },

      recallExpedition(tripId) {
        const s = get();
        set({ yard: liveYard(s, Date.now()), expeditions: recallExpedition(s.expeditions, tripId) });
      },

      completeArcade(game, difficulty, stars, timeMs) {
        const s = get();
        const { state, ...run } = recordArcadeRun(s.arcade, game, difficulty, stars, timeMs, dateKey());
        set({ arcade: state, kibble: s.kibble + run.kibble, pup: winBond(s.pup) });
        return run;
      },

      completeBoss(week, outcome) {
        const s = get();
        const { state, ...result } = applyBossCompletion(s.boss, week, outcome);
        set({
          boss: state,
          kibble: s.kibble + result.kibble,
          treats: s.treats + result.treats,
          pup: winBond(s.pup),
          stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome) },
        });
        return result;
      },

      completeCafe(level, outcome) {
        const s = get();
        const { state, ...result } = applyCafeCompletion(s.cafe, level, outcome.stars);
        set({
          cafe: state,
          kibble: s.kibble + result.kibble,
          treats: s.treats + result.treats,
          pup: winBond(s.pup),
          stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome) },
        });
        return result;
      },

      claimBadge(id) {
        const s = get();
        const status = allBadgeStatus(badgeInput(s), s.badges).find((b) => b.badge.id === id);
        if (!status || status.earned <= status.claimed) return null;
        const rewards = pendingRewards(status);
        const owned = [...s.cosmetics.owned];
        for (const r of rewards) if (r.cosmetic && !owned.includes(r.cosmetic)) owned.push(r.cosmetic);
        set({
          badges: { ...s.badges, [id]: status.earned },
          kibble: s.kibble + rewards.reduce((n, r) => n + r.kibble, 0),
          treats: s.treats + rewards.reduce((n, r) => n + r.treats, 0),
          cosmetics: { ...s.cosmetics, owned },
        });
        return rewards;
      },

      debugTimeTravel(ms) {
        shiftLastSeen(ms);
        set((s) => ({
          yard: { ...s.yard, settledAt: s.yard.settledAt - ms },
          pup: s.pup ? shiftPupTime(s.pup, ms) : s.pup,
          expeditions: shiftExpeditions(s.expeditions, ms),
        }));
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

/** The parts of the save that badges track. */
export function badgeInput(
  s: Pick<SaveData, 'progress' | 'stats' | 'daily' | 'chests' | 'arcade' | 'expeditions' | 'pack' | 'pup' | 'boss' | 'cafe'>,
): BadgeInput {
  return {
    progress: s.progress,
    totals: s.stats.totals,
    dailyBest: s.daily.best,
    chests: s.chests,
    arcade: s.arcade,
    album: s.expeditions.album,
    pack: s.pack,
    bondXp: s.pup?.bondXp ?? 0,
    boss: s.boss,
    cafe: s.cafe,
  };
}

export function exportSave(): string {
  return JSON.stringify(pickSave(useSave.getState()));
}
