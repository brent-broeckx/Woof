import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { POWER_UPS, POWER_UP_IDS, type PowerUpId } from '../core/economy/powerups';
import { rollBonusReward, treatsForImprovement } from '../core/economy/rewards';
import type { MiniGameId } from '../core/progression/levels';
import type { GameState } from '../core/puzzle/game';

export interface Settings {
  autoCross: boolean;
  highlightDone: boolean;
  placementMode: 'x' | 'dog';
  showTimer: boolean;
  reducedMotion: boolean;
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
}

interface SaveActions {
  completePuzzle(levelId: number, stars: number, timeMs: number): { treats: number; improved: boolean };
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
};

const freshSave = (): SaveData => ({
  version: 1,
  seed: Math.floor(Math.random() * 2 ** 31),
  progress: {},
  inventory: { ...emptyInventory(), shield: 1, extraBone: 1 },
  treats: 0,
  pity: 0,
  settings: { ...DEFAULT_SETTINGS },
  inProgress: null,
  seenTips: {},
});

export const useSave = create<SaveData & SaveActions>()(
  persist(
    (set, get) => ({
      ...freshSave(),

      completePuzzle(levelId, stars, timeMs) {
        const prev = get().progress[levelId];
        const treats = treatsForImprovement(prev?.stars ?? 0, stars);
        set((s) => ({
          treats: s.treats + treats,
          inProgress: null,
          progress: {
            ...s.progress,
            [levelId]: {
              stars: Math.max(prev?.stars ?? 0, stars),
              bestTimeMs: Math.min(prev?.bestTimeMs ?? Infinity, timeMs),
            },
          },
        }));
        return { treats, improved: stars > (prev?.stars ?? 0) };
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
          set({ ...freshSave(), ...data, inventory: { ...emptyInventory(), ...data.inventory }, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
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
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SaveData>;
        return {
          ...current,
          ...p,
          inventory: p.inventory ? { ...emptyInventory(), ...p.inventory } : current.inventory,
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
        };
      },
    },
  ),
);

export function highestUnlocked(progress: Record<number, LevelProgress>): number {
  let id = 1;
  while (progress[id]) id++;
  return id;
}

export function exportSave(): string {
  const s = useSave.getState();
  const data: SaveData = {
    version: 1, seed: s.seed, progress: s.progress, inventory: s.inventory, treats: s.treats,
    pity: s.pity, settings: s.settings, inProgress: s.inProgress, seenTips: s.seenTips,
  };
  return JSON.stringify(data);
}
