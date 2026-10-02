import { describe, expect, it } from 'vitest';
import {
  claimExpedition,
  DESTINATIONS,
  destinationUnlocked,
  DUPLICATE_TREATS,
  emptyExpeditions,
  MAX_TRIPS,
  normalizeExpeditions,
  recallExpedition,
  rollExpedition,
  shiftExpeditions,
  startExpedition,
  tripTreats,
  type ExpeditionState,
} from './expeditions';
import { HOUR } from './pup';
import { dogRate } from './yard';

const team = [{ breed: 'pug', level: 1 }];
const beach = DESTINATIONS[2];

describe('expeditions', () => {
  it('pays more than staying home and scales with the world', () => {
    const home = dogRate(team[0]) * 4;
    expect(tripTreats(team, DESTINATIONS[0], 4)).toBeGreaterThan(home);
    expect(tripTreats(team, beach, 4)).toBeGreaterThan(tripTreats(team, DESTINATIONS[0], 4));
  });

  it('rolls loot deterministically per trip index', () => {
    const a = rollExpedition(42, 3, team, beach, 8);
    expect(rollExpedition(42, 3, team, beach, 8)).toEqual(a);
    expect(a.postcard?.startsWith('beach.')).toBe(true);
    const rolls = Array.from({ length: 40 }, (_, i) => rollExpedition(42, i, team, beach, 1));
    expect(new Set(rolls.map((r) => r.postcard)).size).toBeGreaterThan(1);
  });

  it('starts trips with validation', () => {
    let s = emptyExpeditions();
    const next = startExpedition(s, 1, team, 'beach', 4, 0);
    expect(next?.trips[0].endsAt).toBe(4 * HOUR);
    expect(next?.sent).toBe(1);
    s = next!;
    expect(startExpedition(s, 1, team, 'beach', 4, 0)).toBeNull(); // pug is already away
    expect(startExpedition(s, 1, [{ breed: 'poodle', level: 1 }], 'moon', 4, 0)).toBeNull();
    expect(startExpedition(s, 1, [{ breed: 'poodle', level: 1 }], 'beach', 3, 0)).toBeNull();
    expect(startExpedition(s, 1, [], 'beach', 1, 0)).toBeNull();
    const dogs = ['poodle', 'beagle', 'husky'];
    for (const d of dogs.slice(0, MAX_TRIPS - 1)) s = startExpedition(s, 1, [{ breed: d, level: 1 }], 'park', 1, 0)!;
    expect(startExpedition(s, 1, [{ breed: 'husky', level: 1 }], 'park', 1, 0)).toBeNull();
  });

  it('only claims finished trips, files postcards and pays set rewards once', () => {
    const dest = DESTINATIONS[0];
    let s: ExpeditionState = { ...emptyExpeditions(), album: Object.fromEntries(dest.postcards.slice(1).map((p) => [p.id, 1])) };
    s = startExpedition(s, 1, team, dest.id, 8, 0)!;
    s = { ...s, trips: [{ ...s.trips[0], loot: { ...s.trips[0].loot, postcard: dest.postcards[0].id } }] };
    expect(claimExpedition(s, 0, HOUR)).toBeNull();
    const r = claimExpedition(s, 0, 8 * HOUR)!;
    expect(r.newPostcard).toBe(true);
    expect(r.completedSet).toBe(dest.id);
    expect(r.state.trips).toHaveLength(0);
    let again = startExpedition(r.state, 1, team, dest.id, 8, 0)!;
    again = { ...again, trips: [{ ...again.trips[0], loot: { ...again.trips[0].loot, postcard: dest.postcards[0].id } }] };
    const r2 = claimExpedition(again, 1, 8 * HOUR)!;
    expect(r2.duplicateTreats).toBe(DUPLICATE_TREATS);
    expect(r2.completedSet).toBeNull();
  });

  it('recalls and time-shifts trips', () => {
    const s = startExpedition(emptyExpeditions(), 1, team, 'beach', 8, 10 * HOUR)!;
    expect(shiftExpeditions(s, 8 * HOUR).trips[0].endsAt).toBe(10 * HOUR);
    expect(recallExpedition(s, 0).trips).toHaveLength(0);
  });

  it('unlocks destinations by world progress', () => {
    expect(destinationUnlocked(DESTINATIONS[0], 1, 25)).toBe(true);
    expect(destinationUnlocked(DESTINATIONS[1], 25, 25)).toBe(false);
    expect(destinationUnlocked(DESTINATIONS[1], 26, 25)).toBe(true);
  });

  it('normalizes broken saves', () => {
    const s = startExpedition(emptyExpeditions(), 1, team, 'beach', 8, 0)!;
    const raw = { ...s, album: { 'beach.crab': 2, 'nope.x': 1 }, sets: { beach: true, nope: true } };
    const n = normalizeExpeditions(JSON.parse(JSON.stringify(raw)), new Set(['pug']));
    expect(n.trips).toHaveLength(1);
    expect(n.album).toEqual({ 'beach.crab': 2 });
    expect(n.sets).toEqual({ beach: true });
    expect(normalizeExpeditions(raw, new Set()).trips).toHaveLength(0);
    expect(normalizeExpeditions(null, new Set())).toEqual(emptyExpeditions());
  });
});
