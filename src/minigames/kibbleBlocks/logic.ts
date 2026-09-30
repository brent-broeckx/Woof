import { createRng, hashSeed, type Rng } from '../../core/rng';

export interface KibbleConfig {
  treats: number;
  rounds: number;
}
export interface KibblePieceDef {
  id: string;
  name: string;
  cells: readonly (readonly [number, number])[];
  tierWeight: (tier: number) => number;
}
export interface KibblePiece {
  uid: string;
  shapeId: string;
  rotation: number;
  cells: [number, number][];
}
export interface KibblePuzzle {
  size: 8;
  treats: boolean[];
  dealShapeIds: string[][];
  seed: number;
}
export interface KibbleState {
  puzzle: KibblePuzzle;
  occupied: boolean[];
  collected: boolean[];
  hand: (KibblePiece | null)[];
  roundIndex: number;
  placedThisRound: number;
  totalPlaced: number;
  score: number;
  over: boolean;
  won: boolean;
}

const cells = (coords: [number, number][]) => coords;
export const KIBBLE_SHAPES: KibblePieceDef[] = [
  { id: 'mono', name: 'Snack', cells: cells([[0, 0]]), tierWeight: () => 12 },
  {
    id: 'i2',
    name: 'Domino',
    cells: cells([
      [0, 0],
      [0, 1],
    ]),
    tierWeight: () => 11,
  },
  {
    id: 'i3',
    name: 'Triple',
    cells: cells([
      [0, 0],
      [0, 1],
      [0, 2],
    ]),
    tierWeight: () => 10,
  },
  {
    id: 'v3',
    name: 'Tall Triple',
    cells: cells([
      [0, 0],
      [1, 0],
      [2, 0],
    ]),
    tierWeight: () => 8,
  },
  {
    id: 'l3',
    name: 'Corner',
    cells: cells([
      [0, 0],
      [1, 0],
      [1, 1],
    ]),
    tierWeight: () => 8,
  },
  {
    id: 'i4',
    name: 'Long',
    cells: cells([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]),
    tierWeight: (t) => (t < 4 ? 4 : 7),
  },
  {
    id: 'o4',
    name: 'Bowl',
    cells: cells([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]),
    tierWeight: () => 7,
  },
  {
    id: 't4',
    name: 'T Bone',
    cells: cells([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ]),
    tierWeight: (t) => (t < 4 ? 3 : 6),
  },
  {
    id: 'l4',
    name: 'Boot',
    cells: cells([
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ]),
    tierWeight: (t) => (t < 4 ? 3 : 6),
  },
  {
    id: 'j4',
    name: 'Hook',
    cells: cells([
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 0],
    ]),
    tierWeight: (t) => (t < 4 ? 3 : 6),
  },
  {
    id: 's4',
    name: 'S Treat',
    cells: cells([
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ]),
    tierWeight: (t) => (t < 5 ? 2 : 5),
  },
  {
    id: 'z4',
    name: 'Z Treat',
    cells: cells([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
    tierWeight: (t) => (t < 5 ? 2 : 5),
  },
  {
    id: 'i5',
    name: 'Big Stick',
    cells: cells([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]),
    tierWeight: (t) => (t < 7 ? 1 : 4),
  },
  {
    id: 'cross5',
    name: 'Paw',
    cells: cells([
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ]),
    tierWeight: (t) => (t < 8 ? 1 : 3),
  },
  {
    id: 'square9',
    name: 'Feast',
    cells: cells([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ]),
    tierWeight: (t) => (t < 10 ? 0.4 : 2),
  },
];

export function kibbleBlocksConfigForTier(tier: number): KibbleConfig {
  const treats = Math.min(8, 3 + Math.floor((tier - 1) / 3));
  const rounds = treats + 2 + Math.floor(tier / 7);
  return { treats, rounds };
}

function shapeById(id: string): KibblePieceDef {
  const shape = KIBBLE_SHAPES.find((s) => s.id === id);
  if (!shape) throw new Error(`Unknown kibble shape ${id}`);
  return shape;
}

function normalize(pieceCells: readonly (readonly [number, number])[]): [number, number][] {
  const minR = Math.min(...pieceCells.map(([r]) => r));
  const minC = Math.min(...pieceCells.map(([, c]) => c));
  return pieceCells.map(([r, c]) => [r - minR, c - minC] as [number, number]).sort(([ar, ac], [br, bc]) => ar - br || ac - bc);
}

export function rotateCells(pieceCells: readonly (readonly [number, number])[], turns: number): [number, number][] {
  let next = pieceCells.map(([r, c]) => [r, c] as [number, number]);
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) next = next.map(([r, c]) => [c, -r]);
  return normalize(next);
}

export function makeKibblePiece(shapeId: string, uid: string, rotation = 0): KibblePiece {
  return { uid, shapeId, rotation, cells: rotateCells(shapeById(shapeId).cells, rotation) };
}

export function rotatePiece(piece: KibblePiece): KibblePiece {
  return makeKibblePiece(piece.shapeId, piece.uid, piece.rotation + 1);
}

function randomShapeId(rng: Rng, tier: number): string {
  return rng.weighted(KIBBLE_SHAPES.map((s) => [s.id, s.tierWeight(tier)] as const).filter(([, w]) => w > 0));
}

export function generateKibblePuzzle(config: KibbleConfig, seed: number): KibblePuzzle {
  const rng = createRng(seed);
  const treats = new Array(64).fill(false) as boolean[];
  const rows = rng.shuffle(Array.from({ length: 8 }, (_, i) => i));
  for (let i = 0; i < config.treats; i++) treats[rows[i] * 8 + rng.int(8)] = true;
  const dealShapeIds: string[][] = [];
  for (let r = 0; r < config.rounds; r++) {
    const scripted = r < config.treats ? ['i5', 'i3', 'mono'] : [];
    const deal = [...scripted];
    while (deal.length < 3) deal.push(randomShapeId(rng, Math.max(1, config.treats)));
    dealShapeIds.push(rng.shuffle(deal));
  }
  return { size: 8, treats, dealShapeIds, seed };
}

function handForRound(puzzle: KibblePuzzle, roundIndex: number): KibblePiece[] {
  return puzzle.dealShapeIds[roundIndex].map((shapeId, i) => makeKibblePiece(shapeId, `${roundIndex}-${i}`));
}

export function createKibbleState(puzzle: KibblePuzzle): KibbleState {
  const state: KibbleState = {
    puzzle,
    occupied: new Array(64).fill(false) as boolean[],
    collected: new Array(64).fill(false) as boolean[],
    hand: handForRound(puzzle, 0),
    roundIndex: 0,
    placedThisRound: 0,
    totalPlaced: 0,
    score: 0,
    over: false,
    won: false,
  };
  return hasAnyFit(state) ? state : { ...state, over: true };
}

export function canPlace(occupied: readonly boolean[], piece: KibblePiece, row: number, col: number, size = 8): boolean {
  return piece.cells.every(([r, c]) => {
    const rr = row + r;
    const cc = col + c;
    return rr >= 0 && cc >= 0 && rr < size && cc < size && !occupied[rr * size + cc];
  });
}

function fullRowsAndCols(occupied: readonly boolean[], size = 8): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < size; r++) if (Array.from({ length: size }, (_, c) => occupied[r * size + c]).every(Boolean)) rows.push(r);
  for (let c = 0; c < size; c++) if (Array.from({ length: size }, (_, r) => occupied[r * size + c]).every(Boolean)) cols.push(c);
  return { rows, cols };
}

export function placeKibblePiece(state: KibbleState, handIndex: number, row: number, col: number): KibbleState {
  const piece = state.hand[handIndex];
  if (state.over || !piece || !canPlace(state.occupied, piece, row, col)) return state;
  const occupied = [...state.occupied];
  for (const [r, c] of piece.cells) occupied[(row + r) * 8 + col + c] = true;
  const { rows, cols } = fullRowsAndCols(occupied);
  const collected = [...state.collected];
  let gainedTreats = 0;
  for (let cell = 0; cell < 64; cell++) {
    if (state.puzzle.treats[cell] && !collected[cell] && (rows.includes(Math.floor(cell / 8)) || cols.includes(cell % 8))) {
      collected[cell] = true;
      gainedTreats++;
    }
  }
  if (rows.length || cols.length) {
    for (const r of rows) for (let c = 0; c < 8; c++) occupied[r * 8 + c] = false;
    for (const c of cols) for (let r = 0; r < 8; r++) occupied[r * 8 + c] = false;
  }
  const hand = [...state.hand];
  hand[handIndex] = null;
  let next: KibbleState = {
    ...state,
    occupied,
    collected,
    hand,
    placedThisRound: state.placedThisRound + 1,
    totalPlaced: state.totalPlaced + 1,
    score: state.score + piece.cells.length * 10 + (rows.length + cols.length) * 100 + gainedTreats * 250,
  };
  next.won = countCollected(next) === countTreats(next.puzzle);
  if (next.won) return { ...next, over: true };
  if (next.hand.every((p) => p === null)) {
    if (next.roundIndex + 1 >= next.puzzle.dealShapeIds.length) return { ...next, over: true };
    next = { ...next, roundIndex: next.roundIndex + 1, placedThisRound: 0, hand: handForRound(next.puzzle, next.roundIndex + 1) };
  }
  return hasAnyFit(next) ? next : { ...next, over: true };
}

export function countTreats(puzzle: KibblePuzzle): number {
  return puzzle.treats.filter(Boolean).length;
}

export function countCollected(state: KibbleState): number {
  return state.collected.filter(Boolean).length;
}

export function hasAnyFit(state: KibbleState): boolean {
  return state.hand.some((piece) => piece && placementsForPiece(state.occupied, piece).length > 0);
}

export function placementsForPiece(occupied: readonly boolean[], piece: KibblePiece): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (canPlace(occupied, piece, r, c)) out.push([r, c]);
  return out;
}

export function kibbleBlocksStars(state: KibbleState): 0 | 1 | 2 | 3 {
  const total = countTreats(state.puzzle);
  const collected = countCollected(state);
  if (collected === total) return 3;
  if (collected / total >= 0.6) return 2;
  return state.totalPlaced > 0 || state.roundIndex > 0 ? 1 : 0;
}

export function scriptedKibbleSolution(puzzle: KibblePuzzle): { handIndex: number; row: number; col: number }[] {
  const solution: { handIndex: number; row: number; col: number }[] = [];
  for (let round = 0; round < countTreats(puzzle); round++) {
    const row = Math.floor(
      puzzle.treats.findIndex(
        (v, i) => v && Math.floor(i / 8) === [...new Set(puzzle.treats.map((t, idx) => (t ? Math.floor(idx / 8) : -1)).filter((r) => r >= 0))][round],
      ) / 8,
    );
    const deal = puzzle.dealShapeIds[round];
    solution.push({ handIndex: deal.indexOf('i5'), row, col: 0 });
    solution.push({ handIndex: deal.indexOf('i3'), row, col: 5 });
    solution.push({ handIndex: deal.indexOf('mono'), row, col: 0 });
  }
  return solution;
}

export function kibbleSeedForRound(seed: number, round: number): number {
  return hashSeed('kibbleBlocks', seed, round);
}
