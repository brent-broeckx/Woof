import { useEffect, useState } from 'react';
import { currentFullness, moodFor, type PupMood, type PupState } from '../../core/pet/pup';
import { useSave } from '../../store/saveStore';

/** Re-renders every `ms` so time-based values (hunger, production) stay fresh. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export interface PupView {
  pup: PupState;
  fullness: number;
  mood: PupMood;
}

export function usePup(): PupView | null {
  const pup = useSave((s) => s.pup);
  const now = useNow();
  if (!pup) return null;
  const fullness = currentFullness(pup, now);
  return { pup, fullness, mood: moodFor(fullness) };
}
