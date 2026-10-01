import { describe, expect, it } from 'vitest';
import { createMemoryState, flipMemoryCard, generateMemoryPuzzle, memoryFetchConfigForTier, memoryFetchStars, resolveMemoryMismatch } from './logic';

describe('memoryFetch', () => {
  it('generates deterministic solvable decks', () => {
    for (const tier of [1, 8, 12, 20]) {
      const config = memoryFetchConfigForTier(tier);
      const a = generateMemoryPuzzle(config, 55);
      const b = generateMemoryPuzzle(config, 55);
      expect(a).toEqual(b);
      const dogCards = a.cards.filter((c) => c.kind === 'dog');
      expect(dogCards.length % 2).toBe(0);
      for (const card of dogCards) expect(dogCards.filter((c) => c.id.slice(0, -1) === card.id.slice(0, -1))).toHaveLength(2);
    }
  });

  it('gives every pair a visually unique face', () => {
    for (const tier of [1, 4, 8, 12, 16, 20]) {
      const puzzle = generateMemoryPuzzle(memoryFetchConfigForTier(tier), 9);
      const faces = new Map<string, string>();
      for (const card of puzzle.cards.filter((c) => c.kind === 'dog')) {
        const face = `${card.breed}|${card.accessory ?? 'none'}`;
        const pair = card.id.slice(0, -1);
        expect(faces.get(face) ?? pair).toBe(pair);
        faces.set(face, pair);
      }
    }
  });

  it('matches pairs and wins after all pairs are found', () => {
    const puzzle = generateMemoryPuzzle(memoryFetchConfigForTier(1), 2);
    let state = createMemoryState(puzzle);
    const pairs = new Map<string, number[]>();
    puzzle.cards.forEach((card, i) => {
      if (card.kind === 'dog') pairs.set(card.id.slice(0, -1), [...(pairs.get(card.id.slice(0, -1)) ?? []), i]);
    });
    for (const pair of pairs.values()) {
      state = flipMemoryCard(state, pair[0]);
      state = flipMemoryCard(state, pair[1]);
    }
    expect(state.won).toBe(true);
    expect(memoryFetchStars(state)).toBe(3);
  });

  it('locks mismatches, resolves after delay, and swaps later-tier cards after four misses', () => {
    const puzzle = generateMemoryPuzzle(memoryFetchConfigForTier(12), 3);
    let state = createMemoryState(puzzle);
    const mismatch = () => {
      const first = state.cards.findIndex((c) => !c.matched && !c.faceUp && c.kind === 'dog');
      const second = state.cards.findIndex(
        (c, i) => i !== first && !c.matched && !c.faceUp && c.kind === 'dog' && c.id.slice(0, -1) !== state.cards[first].id.slice(0, -1),
      );
      state = flipMemoryCard(state, first);
      state = flipMemoryCard(state, second);
      expect(state.locked).toBe(true);
      state = resolveMemoryMismatch(state);
      expect(state.locked).toBe(false);
    };
    for (let i = 0; i < 4; i++) mismatch();
    expect(state.misses).toBe(4);
    expect(state.lastSwap).not.toBeNull();
  });

  it('uses miss thresholds for stars', () => {
    const puzzle = generateMemoryPuzzle(memoryFetchConfigForTier(1), 1);
    const state = { ...createMemoryState(puzzle), won: true, attempts: 1, misses: 99 };
    expect(memoryFetchStars({ ...state, misses: 0 })).toBe(3);
    expect(memoryFetchStars({ ...state, misses: 7 })).toBe(2);
    expect(memoryFetchStars(state)).toBe(1);
  });
});
