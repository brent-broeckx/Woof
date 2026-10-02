/**
 * Expeditions: send pack dogs on timed trips to the worlds' destinations.
 * Dogs on a trip don't produce at home. Loot is rolled (seeded) when the trip
 * starts and stored with it, so reloading can never change the result.
 * Trips bring back treats and sometimes power-ups, kibble and postcards.
 */
import { POWER_UP_IDS, type PowerUpId } from '../economy/powerups';
import { createRng, hashSeed } from '../rng';
import { dogRate, type Producer } from './yard';
import { HOUR } from './pup';

export interface Postcard {
  id: string;
  title: string;
  emoji: string;
}

export interface Destination {
  id: string;
  /** World whose levels unlock this destination. */
  world: number;
  name: string;
  emoji: string;
  postcards: Postcard[];
}

const cards = (dest: string, list: [string, string, string][]): Postcard[] => list.map(([id, emoji, title]) => ({ id: `${dest}.${id}`, emoji, title }));

export const DESTINATIONS: Destination[] = [
  {
    id: 'backyard',
    world: 1,
    name: 'Backyard',
    emoji: '🏡',
    postcards: cards('backyard', [
      ['bone', '🦴', 'Buried Treasure'],
      ['squirrel', '🐿️', 'Squirrel Standoff'],
      ['sprinkler', '💦', 'Sprinkler Dash'],
      ['sunflower', '🌻', 'Sunflower Nap'],
      ['mail', '📬', 'The Mail Is Here'],
      ['moon', '🌙', 'Moon Howl'],
    ]),
  },
  {
    id: 'park',
    world: 2,
    name: 'City Park',
    emoji: '🌳',
    postcards: cards('park', [
      ['duck', '🦆', 'Duck Pond'],
      ['frisbee', '🥏', 'Frisbee Final'],
      ['bench', '🪑', 'Bench Buddies'],
      ['icecream', '🍦', 'Dropped Ice Cream'],
      ['leaves', '🍂', 'Leaf Pile Leap'],
      ['fountain', '⛲', 'Fountain Splash'],
    ]),
  },
  {
    id: 'beach',
    world: 3,
    name: 'Dog Beach',
    emoji: '🏖️',
    postcards: cards('beach', [
      ['waves', '🌊', 'Chasing Waves'],
      ['crab', '🦀', 'Crab Encounter'],
      ['castle', '🏰', 'Sandcastle Wrecker'],
      ['shell', '🐚', 'Seashell Find'],
      ['sunset', '🌅', 'Beach Sunset'],
      ['surf', '🏄', 'Surf Pup'],
    ]),
  },
  {
    id: 'mountain',
    world: 4,
    name: 'Mountain Trail',
    emoji: '🏔️',
    postcards: cards('mountain', [
      ['summit', '🚩', 'Summit Selfie'],
      ['snow', '❄️', 'First Snow'],
      ['campfire', '🔥', 'Campfire Night'],
      ['stream', '🏞️', 'Stream Crossing'],
      ['deer', '🦌', 'Forest Friend'],
      ['stars', '✨', 'Starry Sky'],
    ]),
  },
];

export const destinationById = (id: string) => DESTINATIONS.find((d) => d.id === id);
export const postcardById = (id: string) => DESTINATIONS.flatMap((d) => d.postcards).find((p) => p.id === id);

/** Trip lengths in hours, with the chance of each extra. */
export const DURATIONS = [
  { hours: 1, postcard: 0.35, item: 0.1, kibble: 0 },
  { hours: 4, postcard: 0.75, item: 0.3, kibble: 0.1 },
  { hours: 8, postcard: 1, item: 0.6, kibble: 0.25 },
] as const;

export const MAX_TEAM = 3;
export const MAX_TRIPS = 3;
/** A trip pays more than staying home, to make up for the empty yard. */
export const TRIP_RATE = 1.5;
/** A duplicate postcard turns into this many treats. */
export const DUPLICATE_TREATS = 25;
/** Finishing a destination's postcard set. */
export const SET_REWARD = { treats: 250, kibble: 25 };

export interface ExpeditionLoot {
  treats: number;
  kibble: number;
  items: PowerUpId[];
  postcard: string | null;
}

export interface Expedition {
  /** Trip number (also its seed index). */
  id: number;
  destination: string;
  dogs: string[];
  startedAt: number;
  endsAt: number;
  loot: ExpeditionLoot;
}

export interface ExpeditionState {
  trips: Expedition[];
  /** Trips ever started. */
  sent: number;
  /** Postcard id -> times found. */
  album: Record<string, number>;
  /** Destinations whose set reward was paid. */
  sets: Record<string, boolean>;
}

export const emptyExpeditions = (): ExpeditionState => ({ trips: [], sent: 0, album: {}, sets: {} });

/** A destination is open once you reach its world on the map. */
export const destinationUnlocked = (dest: Destination, highestLevel: number, levelsPerWorld: number) => highestLevel > (dest.world - 1) * levelsPerWorld;

export const awayDogs = (state: ExpeditionState) => new Set(state.trips.flatMap((t) => t.dogs));

export const tripReady = (trip: Expedition, now: number) => now >= trip.endsAt;

/** Treats a team brings back from a trip (before extras). */
export function tripTreats(team: Producer[], dest: Destination, hours: number): number {
  const rate = team.reduce((s, p) => s + dogRate(p), 0);
  return Math.round(rate * hours * TRIP_RATE * (1 + 0.1 * (dest.world - 1)));
}

/** Rolls the loot for trip number `index`. */
export function rollExpedition(saveSeed: number, index: number, team: Producer[], dest: Destination, hours: number): ExpeditionLoot {
  const dur = DURATIONS.find((d) => d.hours === hours) ?? DURATIONS[0];
  const rng = createRng(hashSeed(saveSeed, 'expedition', index));
  const postcard = rng.next() < dur.postcard ? rng.pick(dest.postcards).id : null;
  const items: PowerUpId[] = rng.next() < dur.item ? [rng.pick(POWER_UP_IDS)] : [];
  const kibble = rng.next() < dur.kibble ? 5 * Math.max(1, hours / 4) : 0;
  return { treats: tripTreats(team, dest, hours), kibble, items, postcard };
}

export function startExpedition(
  state: ExpeditionState,
  saveSeed: number,
  team: Producer[],
  destId: string,
  hours: number,
  now: number,
): ExpeditionState | null {
  const dest = destinationById(destId);
  const away = awayDogs(state);
  const breeds = new Set(team.map((p) => p.breed));
  if (!dest || !DURATIONS.some((d) => d.hours === hours)) return null;
  if (state.trips.length >= MAX_TRIPS || team.length < 1 || team.length > MAX_TEAM || breeds.size !== team.length) return null;
  if (team.some((p) => away.has(p.breed))) return null;
  const trip: Expedition = {
    id: state.sent,
    destination: dest.id,
    dogs: team.map((p) => p.breed),
    startedAt: now,
    endsAt: now + hours * HOUR,
    loot: rollExpedition(saveSeed, state.sent, team, dest, hours),
  };
  return { ...state, trips: [...state.trips, trip], sent: state.sent + 1 };
}

export interface ClaimResult {
  state: ExpeditionState;
  loot: ExpeditionLoot;
  /** Postcard was new to the album. */
  newPostcard: boolean;
  /** Treats from a duplicate postcard. */
  duplicateTreats: number;
  /** Destination set finished by this postcard. */
  completedSet: string | null;
}

/** Brings a finished trip home and files its postcard. */
export function claimExpedition(state: ExpeditionState, tripId: number, now: number): ClaimResult | null {
  const trip = state.trips.find((t) => t.id === tripId);
  if (!trip || !tripReady(trip, now)) return null;
  const { postcard } = trip.loot;
  const album = { ...state.album };
  const sets = { ...state.sets };
  let newPostcard = false;
  let duplicateTreats = 0;
  let completedSet: string | null = null;
  if (postcard) {
    newPostcard = !album[postcard];
    if (!newPostcard) duplicateTreats = DUPLICATE_TREATS;
    album[postcard] = (album[postcard] ?? 0) + 1;
    const dest = destinationById(trip.destination);
    if (dest && !sets[dest.id] && dest.postcards.every((p) => album[p.id])) {
      sets[dest.id] = true;
      completedSet = dest.id;
    }
  }
  return {
    state: { ...state, trips: state.trips.filter((t) => t.id !== tripId), album, sets },
    loot: trip.loot,
    newPostcard,
    duplicateTreats,
    completedSet,
  };
}

/** Calls a trip home early: the dogs come back, the loot is lost. */
export function recallExpedition(state: ExpeditionState, tripId: number): ExpeditionState {
  return { ...state, trips: state.trips.filter((t) => t.id !== tripId) };
}

export function shiftExpeditions(state: ExpeditionState, ms: number): ExpeditionState {
  return { ...state, trips: state.trips.map((t) => ({ ...t, startedAt: t.startedAt - ms, endsAt: t.endsAt - ms })) };
}

/** Repairs a saved state; trips with unknown dogs or destinations are dropped. */
export function normalizeExpeditions(v: unknown, ownedBreeds: Set<string>): ExpeditionState {
  const e = (v && typeof v === 'object' ? v : {}) as Partial<ExpeditionState>;
  const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : NaN);
  const int = (n: unknown) => Math.max(0, Math.floor(num(n) || 0));
  const trips: Expedition[] = [];
  const used = new Set<string>();
  for (const raw of Array.isArray(e.trips) ? e.trips : []) {
    if (!raw || typeof raw !== 'object' || trips.length >= MAX_TRIPS) continue;
    const t = raw as Partial<Expedition>;
    const dogs = Array.isArray(t.dogs) ? t.dogs.filter((d): d is string => typeof d === 'string') : [];
    if (!destinationById(String(t.destination)) || !dogs.length || dogs.length > MAX_TEAM) continue;
    if (dogs.some((d) => !ownedBreeds.has(d) || used.has(d))) continue;
    const startedAt = num(t.startedAt);
    const endsAt = num(t.endsAt);
    if (Number.isNaN(startedAt) || Number.isNaN(endsAt)) continue;
    dogs.forEach((d) => used.add(d));
    const l = (t.loot ?? {}) as Partial<ExpeditionLoot>;
    trips.push({
      id: int(t.id),
      destination: String(t.destination),
      dogs,
      startedAt,
      endsAt,
      loot: {
        treats: int(l.treats),
        kibble: int(l.kibble),
        items: Array.isArray(l.items) ? l.items.filter((i): i is PowerUpId => POWER_UP_IDS.includes(i as PowerUpId)) : [],
        postcard: typeof l.postcard === 'string' && postcardById(l.postcard) ? l.postcard : null,
      },
    });
  }
  const album: Record<string, number> = {};
  for (const [id, n] of Object.entries(e.album ?? {})) if (postcardById(id) && int(n) > 0) album[id] = int(n);
  const sets: Record<string, boolean> = {};
  for (const [id, done] of Object.entries(e.sets ?? {})) if (destinationById(id) && done === true) sets[id] = true;
  const sent = Math.max(int(e.sent), ...trips.map((t) => t.id + 1));
  return { trips, sent, album, sets };
}
