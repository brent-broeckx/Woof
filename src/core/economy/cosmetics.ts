/** Cosmetics bought with treats in the Kennel. Purely visual. */
import { decorById } from './decor';

export interface BoardTheme {
  id: string;
  name: string;
  icon: string;
  price: number;
  regionColors: string[];
  border: string;
  cellBorder: string;
  /** Page tint behind the board (null = keep the world colour). */
  background: string | null;
  /** Earned from a badge instead of bought. */
  badgeOnly?: boolean;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic Pastel',
    icon: '🎨',
    price: 0,
    regionColors: ['#f7b5c8', '#a9cdf2', '#f5dc7f', '#b5e2a0', '#c8b2ee', '#f8c190', '#9fdcd4', '#f19c9c', '#e8c9f2', '#d8c0a3', '#c9ced6'],
    border: '#4a3b33',
    cellBorder: 'rgba(74, 59, 51, 0.18)',
    background: null,
  },
  {
    id: 'garden',
    name: 'Spring Garden',
    icon: '🌷',
    price: 150,
    regionColors: ['#ffc9de', '#bfe3ff', '#fff0a8', '#c6f0b0', '#dccbff', '#ffd6a8', '#b8f0e4', '#ffb3b3', '#f3dcff', '#e9d7bf', '#dfe5ea'],
    border: '#4f6b3a',
    cellBorder: 'rgba(79, 107, 58, 0.2)',
    background: '#eef7e2',
  },
  {
    id: 'autumn',
    name: 'Autumn Walk',
    icon: '🍂',
    price: 200,
    regionColors: ['#e9a27c', '#c7b27a', '#f1cf7a', '#a9bf7c', '#c49a8a', '#e8b66b', '#9fbfaa', '#d9876b', '#dcb8a6', '#b8946f', '#c4bcae'],
    border: '#5b3a24',
    cellBorder: 'rgba(91, 58, 36, 0.2)',
    background: '#f7ead9',
  },
  {
    id: 'candy',
    name: 'Candy Shop',
    icon: '🍭',
    price: 250,
    regionColors: ['#ff9ec7', '#8fd3ff', '#ffe066', '#9ff09a', '#c59bff', '#ffb877', '#76e5d3', '#ff8a8a', '#f3b8ff', '#e3c29b', '#c2cbe0'],
    border: '#6a2c5a',
    cellBorder: 'rgba(106, 44, 90, 0.18)',
    background: '#fdeef6',
  },
  {
    id: 'night',
    name: 'Starry Night',
    icon: '🌙',
    price: 300,
    regionColors: ['#b0678a', '#4f79b0', '#b39a3c', '#5e9a55', '#7d64b3', '#b8774a', '#3f9a90', '#b35a5a', '#9a74ad', '#8c7258', '#77808c'],
    border: '#12121f',
    cellBorder: 'rgba(255, 255, 255, 0.14)',
    background: '#2b2d45',
  },
  {
    id: 'trophy',
    name: 'Golden Trophy',
    icon: '🏆',
    price: 0,
    badgeOnly: true,
    regionColors: ['#f6d77a', '#e9c46a', '#fbe7a1', '#d4a72c', '#f2cf63', '#e6b84a', '#fff1bd', '#c9952a', '#f7dc8c', '#dcb45b', '#efe0b0'],
    border: '#6b4a0c',
    cellBorder: 'rgba(107, 74, 12, 0.22)',
    background: '#fff6dc',
  },
];

/** Colour-blind friendly high-contrast palette (Okabe–Ito based + extras). */
export const HIGH_CONTRAST_COLORS = ['#e69f00', '#56b4e9', '#f0e442', '#009e73', '#cc79a7', '#d55e00', '#0072b2', '#ffffff', '#999999', '#a6761d', '#b3de69'];

export type AccessoryId =
  | 'none'
  | 'bandana'
  | 'bow'
  | 'partyHat'
  | 'glasses'
  | 'crown'
  | 'flower'
  | 'tophat'
  | 'medal'
  | 'laurel'
  | 'cape'
  | 'catEars'
  | 'scarf'
  | 'beanie'
  | 'sunhat'
  | 'headphones'
  | 'pirate'
  | 'wizard';

export interface Accessory {
  id: AccessoryId;
  name: string;
  icon: string;
  price: number;
  badgeOnly?: boolean;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'none', name: 'Just the pup', icon: '🐶', price: 0 },
  { id: 'bandana', name: 'Red Bandana', icon: '🧣', price: 100 },
  { id: 'bow', name: 'Pink Bow', icon: '🎀', price: 120 },
  { id: 'scarf', name: 'Cozy Scarf', icon: '🧶', price: 120 },
  { id: 'flower', name: 'Daisy', icon: '🌼', price: 120 },
  { id: 'beanie', name: 'Winter Beanie', icon: '❄️', price: 140 },
  { id: 'sunhat', name: 'Sun Hat', icon: '👒', price: 160 },
  { id: 'glasses', name: 'Cool Shades', icon: '🕶️', price: 180 },
  { id: 'partyHat', name: 'Party Hat', icon: '🥳', price: 200 },
  { id: 'headphones', name: 'Headphones', icon: '🎧', price: 220 },
  { id: 'tophat', name: 'Top Hat', icon: '🎩', price: 260 },
  { id: 'pirate', name: 'Pirate Hat', icon: '🏴‍☠️', price: 280 },
  { id: 'wizard', name: 'Wizard Hat', icon: '🧙', price: 350 },
  { id: 'crown', name: 'Royal Crown', icon: '👑', price: 400 },
  { id: 'medal', name: 'Gold Medal', icon: '🏅', price: 0, badgeOnly: true },
  { id: 'laurel', name: 'Laurel Wreath', icon: '🌿', price: 0, badgeOnly: true },
  { id: 'cape', name: 'Hero Cape', icon: '🦸', price: 0, badgeOnly: true },
  { id: 'catEars', name: 'Cat Ears', icon: '🐱', price: 0, badgeOnly: true },
];

export const themeById = (id: string) => BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
const cosmeticDef = (id: string) => BOARD_THEMES.find((t) => t.id === id) ?? ACCESSORIES.find((a) => a.id === id);
export const isBadgeCosmetic = (id: string) => !!cosmeticDef(id)?.badgeOnly;
/** Treat price; Infinity for unknown and badge-only cosmetics. */
export function cosmeticPrice(id: string): number {
  const decor = decorById(id);
  if (decor) return decor.world ? Infinity : decor.price;
  const def = cosmeticDef(id);
  return !def || def.badgeOnly ? Infinity : def.price;
}
