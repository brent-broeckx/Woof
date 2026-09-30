/** Small seeded PRNG (mulberry32) so levels, shuffles and rewards are reproducible. */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  range(min: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: T[]): T[];
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive);
  return {
    next,
    int,
    range: (min, maxInclusive) => min + int(maxInclusive - min + 1),
    pick: (items) => items[int(items.length)],
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    },
    weighted: (entries) => {
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let roll = next() * total;
      for (const [value, w] of entries) {
        roll -= w;
        if (roll < 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
}

/** Deterministic string/number mixing into a 32-bit seed. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
