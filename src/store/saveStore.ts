import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POWER_UPS, POWER_UP_IDS, type PowerUpId } from '../core/economy/powerups';
import { ACCESSORIES, BOARD_THEMES, cosmeticPrice, type AccessoryId } from '../core/economy/cosmetics';
import { rollBonusReward, rollChest, rollDailyItem, treatsForImprovement } from '../core/economy/rewards';
import { applyDailyCompletion, emptyDaily, type DailyRecord } from '../core/progression/daily';
import { LEVELS_PER_WORLD, TOTAL_LEVELS, type MiniGameId } from '../core/progression/levels';
import { debugUnlockAll } from '../debug/debugStore';
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
}

interface SaveActions {
  completePuzzle(levelId: number, outcome: PuzzleOutcome): { treats: number; improved: boolean };
  recordAttempt(levelId: number): void;
  recordLoss(levelId: number): void;
  completeDaily(date: string, outcome: PuzzleOutcome): { treats: number; item: PowerUpId | null; streak: number; firstTime: boolean };
  completeEndless(size: number, outcome: PuzzleOutcome): { treats: number };
  openChest(worldId: number): { items: PowerUpId[]; treats: number } | null;
  buyCosmetic(id: string): boolean;
  equipTheme(id: string): void;
  equipAccessory(id: AccessoryId): void;
  completeBonus(levelId: number, game: MiniGameId, stars: number): { items: PowerUpId[] };
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
});

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
  };
}

export const useSave = create<SaveData & SaveActions>()(
  persist(
    (set, get) => ({
      ...freshSave(),

      completePuzzle(levelId, outcome) {
        const { stars, timeMs } = outcome;
        const prev = get().progress[levelId];
        const treats = treatsForImprovement(prev?.stars ?? 0, stars);
        set((s) => {
          const ls = s.stats.levels[levelId] ?? emptyLevelStats();
          return {
            treats: s.treats + treats,
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
        return { treats, improved: stars > (prev?.stars ?? 0) };
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
        const treats = firstTime ? 15 + 5 * Math.min(record.streak, 7) : 0;
        set({
          daily: record,
          treats: s.treats + treats,
          inventory: item ? { ...s.inventory, [item]: s.inventory[item] + 1 } : s.inventory,
          stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome, { dailySolved: firstTime ? 1 : 0 }) },
        });
        return { treats, item, streak: record.streak, firstTime };
      },

      completeEndless(size, outcome) {
        const treats = Math.max(1, size - 3) + (outcome.stars === 3 ? 2 : 0);
        set((s) => ({ treats: s.treats + treats, stats: { ...s.stats, totals: addTotals(s.stats.totals, outcome, { endlessSolved: 1 }) } }));
        return { treats };
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
        set({ inventory, treats: s.treats + reward.treats, chests: { ...s.chests, [worldId]: true } });
        return reward;
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
        set({
          inventory,
          pity: reward.pity,
          stats: { ...s.stats, totals: { ...s.stats.totals, bonusPlayed: s.stats.totals.bonusPlayed + 1 } },
          progress: { ...s.progress, [levelId]: { stars: Math.max(prevStars, effective) } },
        });
        return { items: reward.items };
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
      partialize: (s) => ({
        version: s.version,
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
      }),
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
  const s = useSave.getState();
  const data: SaveData = {
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
  };
  return JSON.stringify(data);
}
