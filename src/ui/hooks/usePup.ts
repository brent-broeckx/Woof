import { useEffect, useState } from 'react';
import { currentFullness, moodFor, type PupMood, type PupState } from '../../core/pet/pup';
import { jarCapacity, MOOD_MULT, packRate } from '../../core/pet/yard';
import { liveYard, useSave, yardPack } from '../../store/saveStore';

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

export interface YardView {
  /** Whole treats ready to collect. */
  ready: number;
  jar: number;
  capacity: number;
  /** Base pack rate per hour. */
  rate: number;
  mult: number;
  full: boolean;
}

export function useYard(ms = 1000): YardView | null {
  const pup = useSave((s) => s.pup);
  const yard = useSave((s) => s.yard);
  const pack = useSave((s) => s.pack);
  const expeditions = useSave((s) => s.expeditions);
  const now = useNow(ms);
  if (!pup) return null;
  const rate = packRate(yardPack({ pup, pack, expeditions }));
  const live = liveYard({ pup, pack, yard, expeditions }, now);
  const capacity = jarCapacity(rate);
  const mult = MOOD_MULT[moodFor(currentFullness(pup, now))];
  return { ready: Math.floor(live.jar), jar: live.jar, capacity, rate, mult, full: live.jar >= capacity };
}

/** Trips that are back and waiting to be opened. */
export function useTripsReady(ms = 15_000): number {
  const trips = useSave((s) => s.expeditions.trips);
  const now = useNow(ms);
  return trips.filter((t) => now >= t.endsAt).length;
}
