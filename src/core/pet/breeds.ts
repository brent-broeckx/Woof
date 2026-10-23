/** Visual description used by the DogFace SVG. */
export interface BreedLook {
  fur: string;
  ear: string;
  muzzle: string;
  ears: 'pointy' | 'floppy' | 'round';
  patch?: string;
  spots?: boolean;
  /** Pale cheek/eyebrow markings (e.g. Shiba urajiro). */
  cheeks?: string;
  /** Legendary shimmer. */
  sparkle?: boolean;
}

export type DogRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BreedDef {
  id: string;
  name: string;
  rarity: DogRarity;
  look: BreedLook;
  /** Can be picked as the main pup at adoption. */
  starter?: boolean;
}

/**
 * Every collectable breed. The first 11 entries double as the board breeds
 * (one per yard colour, same order as REGION_COLORS) so their order must not change.
 */
export const BREED_CATALOG: BreedDef[] = [
  { id: 'corgi', name: 'Corgi', rarity: 'common', starter: true, look: { fur: '#f2a65a', ear: '#e08a3c', muzzle: '#fff4e6', ears: 'pointy' } },
  {
    id: 'husky',
    name: 'Husky',
    rarity: 'uncommon',
    starter: true,
    look: { fur: '#8e9aab', ear: '#6b7688', muzzle: '#ffffff', ears: 'pointy', patch: '#ffffff' },
  },
  { id: 'dachshund', name: 'Dachshund', rarity: 'common', starter: true, look: { fur: '#a0643b', ear: '#7a4726', muzzle: '#c98b5e', ears: 'floppy' } },
  { id: 'poodle', name: 'Poodle', rarity: 'uncommon', look: { fur: '#f4efe6', ear: '#e6dccb', muzzle: '#fbf8f2', ears: 'round' } },
  {
    id: 'shiba',
    name: 'Shiba',
    rarity: 'uncommon',
    starter: true,
    look: { fur: '#d2602a', ear: '#a9441a', muzzle: '#fff4e4', ears: 'pointy', cheeks: '#fff4e4' },
  },
  {
    id: 'beagle',
    name: 'Beagle',
    rarity: 'common',
    starter: true,
    look: { fur: '#f0dcc0', ear: '#9a5b2e', muzzle: '#ffffff', ears: 'floppy', patch: '#c7813f' },
  },
  { id: 'pug', name: 'Pug', rarity: 'common', look: { fur: '#e8cfa3', ear: '#4a3b30', muzzle: '#5a483b', ears: 'floppy' } },
  { id: 'dalmatian', name: 'Dalmatian', rarity: 'uncommon', look: { fur: '#ffffff', ear: '#3a3a3a', muzzle: '#ffffff', ears: 'floppy', spots: true } },
  { id: 'golden', name: 'Golden', rarity: 'common', starter: true, look: { fur: '#f1c46b', ear: '#d9a444', muzzle: '#f7dca3', ears: 'floppy' } },
  { id: 'frenchie', name: 'Frenchie', rarity: 'uncommon', look: { fur: '#c9c1b6', ear: '#a79c8e', muzzle: '#e9e3da', ears: 'round', patch: '#6e645a' } },
  { id: 'collie', name: 'Collie', rarity: 'rare', look: { fur: '#3d3431', ear: '#2a2321', muzzle: '#ffffff', ears: 'pointy', patch: '#ffffff' } },
  // Collection-only breeds.
  { id: 'lab', name: 'Choco Lab', rarity: 'common', look: { fur: '#7b4a2e', ear: '#5e3720', muzzle: '#94603f', ears: 'floppy' } },
  { id: 'jack', name: 'Jack Russell', rarity: 'common', look: { fur: '#fbf7f0', ear: '#b9713a', muzzle: '#ffffff', ears: 'floppy', patch: '#e9c49c' } },
  { id: 'schnauzer', name: 'Schnauzer', rarity: 'uncommon', look: { fur: '#7d7f86', ear: '#5a5c63', muzzle: '#d9dade', ears: 'pointy', cheeks: '#c5c7cc' } },
  { id: 'greyhound', name: 'Greyhound', rarity: 'uncommon', look: { fur: '#b7aca3', ear: '#968a80', muzzle: '#d6cdc5', ears: 'round' } },
  { id: 'samoyed', name: 'Samoyed', rarity: 'rare', look: { fur: '#ffffff', ear: '#efe8dc', muzzle: '#ffffff', ears: 'pointy', cheeks: '#fbf3e6' } },
  {
    id: 'bernese',
    name: 'Bernese',
    rarity: 'rare',
    look: { fur: '#2c2524', ear: '#1f1a19', muzzle: '#ffffff', ears: 'floppy', cheeks: '#b5652f', patch: '#ffffff' },
  },
  { id: 'doberman', name: 'Doberman', rarity: 'rare', look: { fur: '#2a2220', ear: '#1d1716', muzzle: '#a8582b', ears: 'pointy', cheeks: '#a8582b' } },
  { id: 'chow', name: 'Chow Chow', rarity: 'epic', look: { fur: '#c8743a', ear: '#a95c27', muzzle: '#e0a066', ears: 'round', cheeks: '#dd9a5f' } },
  { id: 'stbernard', name: 'St. Bernard', rarity: 'epic', look: { fur: '#b4612f', ear: '#7c3e1b', muzzle: '#ffffff', ears: 'floppy', patch: '#ffffff' } },
  { id: 'royalpoodle', name: 'Royal Poodle', rarity: 'epic', look: { fur: '#f7b9d4', ear: '#ee9cc0', muzzle: '#fde3ee', ears: 'round' } },
  {
    id: 'goldshiba',
    name: 'Golden Shiba',
    rarity: 'legendary',
    look: { fur: '#f5c542', ear: '#d9a21b', muzzle: '#fff6d8', ears: 'pointy', cheeks: '#fff6d8', sparkle: true },
  },
  {
    id: 'cosmiccorgi',
    name: 'Cosmic Corgi',
    rarity: 'legendary',
    look: { fur: '#7b6cf0', ear: '#5a4bd1', muzzle: '#e6e1ff', ears: 'pointy', spots: true, sparkle: true },
  },
  {
    id: 'malamute',
    name: 'Malamute',
    rarity: 'epic',
    look: { fur: '#4d5360', ear: '#363b45', muzzle: '#ffffff', ears: 'pointy', patch: '#ffffff', cheeks: '#ffffff' },
  },
];

export const BOARD_BREED_COUNT = 11;
export const STARTER_BREEDS = BREED_CATALOG.filter((b) => b.starter);

const BY_ID = new Map(BREED_CATALOG.map((b) => [b.id, b]));
export const isBreedId = (id: unknown): id is string => typeof id === 'string' && BY_ID.has(id);
export const breedById = (id: string): BreedDef => BY_ID.get(id) ?? BREED_CATALOG[0];

export const RARITY_LABEL: Record<DogRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};
