import { create } from 'zustand';
import type { MiniGameId } from '../core/progression/levels';

export type Screen =
  | { name: 'title' }
  | { name: 'map' }
  | { name: 'level'; id: number }
  | { name: 'kennel' }
  | { name: 'settings' }
  | { name: 'howto' }
  | { name: 'daily' }
  | { name: 'endless' }
  | { name: 'stats' }
  | { name: 'debug' }
  | { name: 'debugGame'; game: MiniGameId; tier: number; seed: number };

interface NavState {
  screen: Screen;
  go(screen: Screen): void;
}

export const useNav = create<NavState>((set) => ({
  screen: { name: 'title' },
  go: (screen) => {
    set({ screen });
    window.scrollTo(0, 0);
  },
}));
