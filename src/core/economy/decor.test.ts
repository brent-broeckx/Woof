import { describe, expect, it } from 'vitest';
import { cosmeticPrice } from './cosmetics';
import { DECOR, DECOR_SLOTS, decorUnlocked, defaultLayout, normalizeLayout } from './decor';

describe('yard decor', () => {
  it('has unique ids and a story item for every world chest', () => {
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
    expect(DECOR.filter((d) => d.world).map((d) => d.world)).toEqual([1, 2, 3, 4, 5]);
  });

  it('starts with a tree, a dog house and daisies', () => {
    const layout = defaultLayout();
    expect(layout).toHaveLength(DECOR_SLOTS);
    expect(layout.filter(Boolean).sort()).toEqual(['daisy', 'doghouse', 'tree']);
  });

  it('normalizes saved layouts', () => {
    expect(normalizeLayout(undefined)).toEqual(defaultLayout());
    const fixed = normalizeLayout(['bone', 'nope', 3]);
    expect(fixed).toHaveLength(DECOR_SLOTS);
    expect(fixed.slice(0, 3)).toEqual(['bone', null, null]);
  });

  it('unlocks free, bought and chest items', () => {
    expect(decorUnlocked('tree', [], {})).toBe(true);
    expect(decorUnlocked('bone', [], {})).toBe(false);
    expect(decorUnlocked('bone', ['bone'], {})).toBe(true);
    expect(decorUnlocked('fountain', ['fountain'], {})).toBe(false);
    expect(decorUnlocked('fountain', [], { 2: true })).toBe(true);
    expect(decorUnlocked('unknown', ['unknown'], {})).toBe(false);
  });

  it('prices decor and never sells story items', () => {
    expect(cosmeticPrice('castle')).toBe(300);
    expect(cosmeticPrice('snowman')).toBe(Infinity);
  });
});
