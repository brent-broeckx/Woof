import type { AccessoryId } from '../../core/economy/cosmetics';
import { createRng, hashSeed } from '../../core/rng';

const BREED_COUNT = 11;
/** Big, unmistakable headwear used to tell repeated breeds apart on large boards. */
const PAIR_HATS: AccessoryId[] = ['partyHat', 'crown', 'tophat', 'bow'];

export interface MemoryConfig {
  rows: number;
  cols: number;
  swapAfterMisses: boolean;
}
export type MemoryCardKind = 'dog' | 'bone';
export interface MemoryCard {
  id: string;
  kind: MemoryCardKind;
  breed: number;
  accessory?: AccessoryId;
  faceUp: boolean;
  matched: boolean;
}
export interface MemoryPuzzle {
  rows: number;
  cols: number;
  cards: MemoryCard[];
  seed: number;
  swapAfterMisses: boolean;
}
export interface MemoryState {
  puzzle: MemoryPuzzle;
  cards: MemoryCard[];
  flipped: number[];
  attempts: number;
  misses: number;
  consecutiveMisses: number;
  locked: boolean;
  won: boolean;
  lastSwap: [number, number] | null;
}

export function memoryFetchConfigForTier(tier: number): MemoryConfig {
  const dims = tier < 4 ? [4, 3] : tier < 8 ? [4, 4] : tier < 12 ? [5, 4] : tier < 16 ? [5, 5] : [6, 5];
  return { rows: dims[1], cols: dims[0], swapAfterMisses: tier >= 10 };
}

export function generateMemoryPuzzle(config: MemoryConfig, seed: number): MemoryPuzzle {
  const rng = createRng(seed);
  const total = config.rows * config.cols;
  const hasBone = total % 2 === 1;
  const pairs = Math.floor(total / 2);
  const cards: MemoryCard[] = [];
  // Every pair gets a unique face: each breed once, then repeats wear a distinct hat.
  for (let p = 0; p < pairs; p++) {
    const breed = p % BREED_COUNT;
    const face = p < BREED_COUNT ? { breed } : { breed, accessory: PAIR_HATS[(p - BREED_COUNT) % PAIR_HATS.length] };
    cards.push({ id: `${p}a`, kind: 'dog', ...face, faceUp: false, matched: false });
    cards.push({ id: `${p}b`, kind: 'dog', ...face, faceUp: false, matched: false });
  }
  if (hasBone) cards.push({ id: 'bone', kind: 'bone', breed: 0, faceUp: true, matched: true });
  rng.shuffle(cards);
  return { rows: config.rows, cols: config.cols, cards, seed, swapAfterMisses: config.swapAfterMisses };
}

export function createMemoryState(puzzle: MemoryPuzzle): MemoryState {
  return {
    puzzle,
    cards: puzzle.cards.map((c) => ({ ...c })),
    flipped: [],
    attempts: 0,
    misses: 0,
    consecutiveMisses: 0,
    locked: false,
    won: false,
    lastSwap: null,
  };
}

export function flipMemoryCard(state: MemoryState, index: number): MemoryState {
  const card = state.cards[index];
  if (state.locked || state.won || !card || card.faceUp || card.matched || state.flipped.length >= 2) return state;
  const cards = state.cards.map((c, i) => (i === index ? { ...c, faceUp: true } : c));
  const flipped = [...state.flipped, index];
  if (flipped.length < 2) return { ...state, cards, flipped, lastSwap: null };
  const [a, b] = flipped;
  const pairId = (id: string) => id.slice(0, -1);
  const match = cards[a].kind === 'dog' && cards[b].kind === 'dog' && cards[a].breed === cards[b].breed && pairId(cards[a].id) === pairId(cards[b].id);
  if (match) {
    const matchedCards = cards.map((c, i) => (i === a || i === b ? { ...c, matched: true, faceUp: true } : c));
    const won = matchedCards.every((c) => c.matched);
    return { ...state, cards: matchedCards, flipped: [], attempts: state.attempts + 1, consecutiveMisses: 0, won, lastSwap: null };
  }
  return {
    ...state,
    cards,
    flipped,
    attempts: state.attempts + 1,
    misses: state.misses + 1,
    consecutiveMisses: state.consecutiveMisses + 1,
    locked: true,
    lastSwap: null,
  };
}

export function resolveMemoryMismatch(state: MemoryState): MemoryState {
  if (!state.locked || state.flipped.length !== 2) return state;
  let cards = state.cards.map((c, i) => (state.flipped.includes(i) ? { ...c, faceUp: false } : { ...c }));
  let lastSwap: [number, number] | null = null;
  if (state.puzzle.swapAfterMisses && state.consecutiveMisses > 0 && state.consecutiveMisses % 4 === 0) {
    const options = cards.map((c, i) => (!c.faceUp && !c.matched ? i : -1)).filter((i) => i >= 0);
    if (options.length >= 2) {
      const rng = createRng(hashSeed(state.puzzle.seed, 'swap', state.misses));
      const a = options[rng.int(options.length)];
      const b = options.filter((i) => i !== a)[rng.int(options.length - 1)];
      [cards[a], cards[b]] = [cards[b], cards[a]];
      lastSwap = [a, b];
    }
  }
  return { ...state, cards, flipped: [], locked: false, lastSwap };
}

export function memoryPairs(puzzle: MemoryPuzzle): number {
  return puzzle.cards.filter((c) => c.kind === 'dog').length / 2;
}

export function memoryFetchStars(state: MemoryState): 0 | 1 | 2 | 3 {
  if (!state.won && state.attempts === 0) return 0;
  const pairs = memoryPairs(state.puzzle);
  if (state.misses <= pairs * 0.6) return 3;
  if (state.misses <= pairs * 1.2) return 2;
  return 1;
}
