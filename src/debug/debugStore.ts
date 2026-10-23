import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Debug tools only exist in `npm run dev`; production builds compile them out. */
export const DEBUG_AVAILABLE = import.meta.env.DEV;

interface DebugState {
  unlockAll: boolean;
  setUnlockAll(on: boolean): void;
}

export const useDebug = create<DebugState>()(
  persist(
    (set) => ({
      unlockAll: false,
      setUnlockAll: (unlockAll) => set({ unlockAll }),
    }),
    { name: 'woofdoku-debug' },
  ),
);

export const debugUnlockAll = () => DEBUG_AVAILABLE && useDebug.getState().unlockAll;
