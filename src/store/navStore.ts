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
  | { name: 'pup' }
  | { name: 'yard' }
  | { name: 'pack' }
  | { name: 'fair' }
  | { name: 'expeditions' }
  | { name: 'album' }
  | { name: 'debug' }
  | { name: 'debugGame'; game: MiniGameId; tier: number; seed: number };

interface NavState {
  screen: Screen;
  /** How long the player was away, when long enough for a "missed you" greeting. */
  greeting: number | null;
  go(screen: Screen): void;
  setGreeting(ms: number | null): void;
}

export const useNav = create<NavState>((set) => ({
  screen: { name: 'title' },
  greeting: null,
  setGreeting: (greeting) => set({ greeting }),
  go: (screen) => {
    set({ screen });
    window.scrollTo(0, 0);
  },
}));
