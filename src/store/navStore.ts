import { create } from 'zustand';

export type Screen =
  | { name: 'title' }
  | { name: 'map' }
  | { name: 'level'; id: number }
  | { name: 'kennel' }
  | { name: 'settings' }
  | { name: 'howto' };

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
