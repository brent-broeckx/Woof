/** Yard decor: looks-only items placed on a small grid in the Yard scene. */

export const DECOR_COLS = 6;
export const DECOR_ROWS = 3;
export const DECOR_SLOTS = DECOR_COLS * DECOR_ROWS;

export interface DecorDef {
  id: string;
  name: string;
  emoji: string;
  /** Treat price (0 = free for everyone). */
  price: number;
  /** Unlocked by opening this world's chest instead of buying. */
  world?: number;
}

export const DECOR: DecorDef[] = [
  { id: 'tree', name: 'Oak Tree', emoji: '🌳', price: 0 },
  { id: 'doghouse', name: 'Dog House', emoji: '🏠', price: 0 },
  { id: 'daisy', name: 'Daisies', emoji: '🌼', price: 0 },
  { id: 'bone', name: 'Big Bone', emoji: '🦴', price: 40 },
  { id: 'rock', name: 'Rock', emoji: '🪨', price: 40 },
  { id: 'ball', name: 'Ball', emoji: '⚽', price: 50 },
  { id: 'mushroom', name: 'Mushroom', emoji: '🍄', price: 50 },
  { id: 'tulip', name: 'Tulips', emoji: '🌷', price: 60 },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', price: 60 },
  { id: 'pumpkin', name: 'Pumpkin', emoji: '🎃', price: 70 },
  { id: 'cactus', name: 'Cactus', emoji: '🌵', price: 70 },
  { id: 'duck', name: 'Rubber Duck', emoji: '🦆', price: 80 },
  { id: 'pine', name: 'Pine Tree', emoji: '🌲', price: 80 },
  { id: 'kite', name: 'Kite', emoji: '🪁', price: 90 },
  { id: 'bench', name: 'Bench', emoji: '🪑', price: 100 },
  { id: 'lantern', name: 'Lantern', emoji: '🏮', price: 120 },
  { id: 'xmas', name: 'Festive Tree', emoji: '🎄', price: 150 },
  { id: 'castle', name: 'Toy Castle', emoji: '🏰', price: 300 },
  { id: 'mailbox', name: 'Mailbox', emoji: '📫', price: 0, world: 1 },
  { id: 'fountain', name: 'Fountain', emoji: '⛲', price: 0, world: 2 },
  { id: 'palm', name: 'Palm Tree', emoji: '🌴', price: 0, world: 3 },
  { id: 'tent', name: 'Camp Tent', emoji: '⛺', price: 0, world: 4 },
  { id: 'snowman', name: 'Snowpup', emoji: '☃️', price: 0, world: 5 },
];

const BY_ID = new Map(DECOR.map((d) => [d.id, d]));
export const decorById = (id: string) => BY_ID.get(id);

export type DecorLayout = (string | null)[];

/** The starting yard: a tree and a dog house at the fence, daisies in front. */
export function defaultLayout(): DecorLayout {
  const layout: DecorLayout = Array(DECOR_SLOTS).fill(null);
  layout[0] = 'tree';
  layout[DECOR_COLS - 1] = 'doghouse';
  layout[DECOR_COLS * 2 + 4] = 'daisy';
  return layout;
}

/** Free items, opened story chests and bought items can be placed. */
export function decorUnlocked(id: string, owned: readonly string[], chests: Record<number, boolean>): boolean {
  const def = decorById(id);
  if (!def) return false;
  if (def.world) return !!chests[def.world];
  return def.price === 0 || owned.includes(id);
}

export function normalizeLayout(v: unknown): DecorLayout {
  if (!Array.isArray(v)) return defaultLayout();
  return Array.from({ length: DECOR_SLOTS }, (_, i) => (typeof v[i] === 'string' && BY_ID.has(v[i]) ? (v[i] as string) : null));
}
