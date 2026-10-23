import { createRng, hashSeed } from '../rng';

export const BONUS_EVERY = 5;
export const LEVELS_PER_WORLD = 25;

export interface World {
  id: number;
  name: string;
  emoji: string;
  background: string;
  accent: string;
}

export const WORLDS: World[] = [
  { id: 1, name: 'Backyard', emoji: '🏡', background: '#e7f3dc', accent: '#6fa35a' },
  { id: 2, name: 'City Park', emoji: '🌳', background: '#dcefe9', accent: '#3f9a83' },
  { id: 3, name: 'Dog Beach', emoji: '🏖️', background: '#fbefd6', accent: '#d69a3c' },
  { id: 4, name: 'Mountain Trail', emoji: '🏔️', background: '#e3e8f4', accent: '#5a74b3' },
  { id: 5, name: 'Snowy Woods', emoji: '❄️', background: '#eef4fa', accent: '#4f8fb8' },
];

export const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;

export type MiniGameId =
  | 'connectLeashes'
  | 'blockDrop'
  | 'slidingPup'
  | 'kibbleBlocks'
  | 'memoryFetch'
  | 'nonogramPaws'
  | 'rushHour'
  | 'waterSort'
  | 'bubbleShooter'
  | 'pipeSprinklers';
/** Introduction order: one new game every bonus level, then a weighted rotation. */
export const MINI_GAME_IDS: MiniGameId[] = [
  'connectLeashes',
  'blockDrop',
  'slidingPup',
  'kibbleBlocks',
  'memoryFetch',
  'nonogramPaws',
  'rushHour',
  'waterSort',
  'bubbleShooter',
  'pipeSprinklers',
];

export type LevelEntry =
  | { id: number; world: number; kind: 'puzzle'; puzzleIndex: number }
  | { id: number; world: number; kind: 'bonus'; bonusIndex: number; game: MiniGameId; tier: number; seed: number };

export const isBonusLevel = (id: number) => id % BONUS_EVERY === 0;
export const worldOf = (id: number) => Math.ceil(id / LEVELS_PER_WORLD);

/** Mini-games are introduced in order, then rotate without repeating back-to-back. */
export function bonusGameSequence(count: number): MiniGameId[] {
  const seq: MiniGameId[] = [];
  const rng = createRng(hashSeed('bonus-rotation'));
  for (let i = 0; i < count; i++) {
    if (i < MINI_GAME_IDS.length) {
      seq.push(MINI_GAME_IDS[i]);
      continue;
    }
    const recent = seq.slice(-2);
    const options = MINI_GAME_IDS.filter((g) => g !== seq[i - 1]);
    // Prefer the game that was not in the last two.
    const fresh = options.filter((g) => !recent.includes(g));
    seq.push(fresh.length && rng.next() < 0.7 ? rng.pick(fresh) : rng.pick(options));
  }
  return seq;
}

/** Hardest mini-game tier: the last bonus level of the last world. */
export const MAX_BONUS_TIER = TOTAL_LEVELS / BONUS_EVERY;

// The rotation is generated sequentially, so growing it keeps every earlier entry the same.
let bonusSequence = bonusGameSequence(MAX_BONUS_TIER);
function bonusGameAt(index: number): MiniGameId {
  if (index >= bonusSequence.length) bonusSequence = bonusGameSequence(Math.max(index + 1, bonusSequence.length * 2));
  return bonusSequence[index];
}

/** Levels past the last world: endless extra levels once every world is done. */
export const isExtraLevel = (id: number) => id > TOTAL_LEVELS;

export function getLevel(id: number): LevelEntry {
  // Extra levels have no world of their own, so they reuse the last world's look.
  const world = Math.min(worldOf(id), WORLDS.length);
  if (isBonusLevel(id)) {
    const bonusIndex = id / BONUS_EVERY - 1;
    return {
      id,
      world,
      kind: 'bonus',
      bonusIndex,
      game: bonusGameAt(bonusIndex),
      tier: Math.min(bonusIndex + 1, MAX_BONUS_TIER),
      seed: hashSeed('bonus', id),
    };
  }
  return { id, world, kind: 'puzzle', puzzleIndex: id - Math.floor(id / BONUS_EVERY) - 1 };
}

export const PUZZLE_COUNT = TOTAL_LEVELS - TOTAL_LEVELS / BONUS_EVERY;

/** Board sizes for every puzzle slot (4 puzzles per cycle, 5 cycles per world). */
export const PUZZLE_SIZES: number[][][] = [
  [
    [4, 4, 5, 5],
    [5, 5, 5, 6],
    [5, 6, 6, 6],
    [6, 6, 6, 6],
    [6, 6, 6, 6],
  ],
  [
    [6, 6, 7, 6],
    [6, 7, 7, 7],
    [7, 7, 7, 7],
    [7, 7, 7, 7],
    [7, 7, 7, 7],
  ],
  [
    [7, 7, 8, 7],
    [7, 8, 8, 8],
    [8, 8, 8, 8],
    [8, 8, 8, 8],
    [8, 8, 8, 8],
  ],
  [
    [8, 8, 9, 8],
    [8, 9, 9, 9],
    [9, 9, 9, 9],
    [9, 9, 9, 10],
    [9, 9, 10, 10],
  ],
  [
    [9, 9, 10, 9],
    [9, 10, 10, 10],
    [10, 10, 10, 10],
    [10, 10, 10, 11],
    [10, 10, 11, 11],
  ],
];

/** Hardest technique difficulty allowed per world (see docs/05). */
export const WORLD_MAX_DIFFICULTY = [3, 4, 5, 6, 6];

export interface ExtraPuzzleSpec {
  size: number;
  seed: number;
  maxDifficulty: number;
  minDifficulty?: number;
}

/** Board-size weights per slot in a 5-level cycle (easy, medium, medium, hard). */
const EXTRA_SIZE_WEIGHTS: [size: number, weight: number][][] = [
  [
    [5, 2],
    [6, 3],
    [7, 3],
    [8, 2],
    [9, 1],
  ],
  [
    [5, 1],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 2],
    [10, 1],
  ],
  [
    [5, 1],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 2],
    [10, 1],
  ],
  [
    [7, 1],
    [8, 2],
    [9, 3],
    [10, 3],
    [11, 1],
  ],
];

/** The hardest technique a board of this size can sensibly ask for. */
const extraMaxDifficulty = (size: number) => Math.min(WORLD_MAX_DIFFICULTY[WORLD_MAX_DIFFICULTY.length - 1], size - 2);

/**
 * Extra levels are generated on the fly (deterministic per level id). Board sizes are
 * mixed (5×5 up to 11×11) so they stay varied; hard slots lean towards bigger boards.
 */
export function extraPuzzleSpec(id: number): ExtraPuzzleSpec {
  const pos = (id % BONUS_EVERY) - 1;
  const weights = EXTRA_SIZE_WEIGHTS[pos];
  let roll = createRng(hashSeed('extra-size', id)).next() * weights.reduce((a, [, w]) => a + w, 0);
  const [size] = weights.find(([, w]) => (roll -= w) < 0) ?? weights[weights.length - 1];
  const maxDifficulty = extraMaxDifficulty(size);
  const seed = hashSeed('extra-level', id);
  // Nudge the bigger medium/hard boards away from trivial puzzles.
  const minDifficulty = pos > 0 && size >= 7 && size <= 10 ? maxDifficulty - (pos === 3 ? 1 : 2) : undefined;
  return minDifficulty === undefined ? { size, seed, maxDifficulty } : { size, seed, maxDifficulty, minDifficulty };
}

export type SlotRole = 'tutorial' | 'easy' | 'medium' | 'hard';

export interface PuzzleSlot {
  puzzleIndex: number;
  levelId: number;
  world: number;
  size: number;
  role: SlotRole;
  maxDifficulty: number;
}

export function puzzleSlots(): PuzzleSlot[] {
  const slots: PuzzleSlot[] = [];
  for (let id = 1; id <= TOTAL_LEVELS; id++) {
    const level = getLevel(id);
    if (level.kind !== 'puzzle') continue;
    const w = level.world - 1;
    const inWorld = level.puzzleIndex - w * 20;
    const cycle = Math.floor(inWorld / 4);
    const pos = inWorld % 4;
    const role: SlotRole = id <= 3 ? 'tutorial' : pos === 0 ? 'easy' : pos === 3 ? 'hard' : 'medium';
    slots.push({
      puzzleIndex: level.puzzleIndex,
      levelId: id,
      world: level.world,
      size: PUZZLE_SIZES[w][cycle][pos],
      role,
      maxDifficulty: role === 'tutorial' ? 1 : WORLD_MAX_DIFFICULTY[w],
    });
  }
  return slots;
}
