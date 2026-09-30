import { createRng, type Rng } from '../../core/rng';

/** Block Drop — a short, goal-based falling-blocks game. */

export const WIDTH = 10;
export const HEIGHT = 18;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const SHAPES: Record<PieceType, { n: number; cells: [number, number][] }> = {
  I: {
    n: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    n: 2,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  T: {
    n: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    n: 3,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    n: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    n: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    n: 3,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};

export const PIECE_COLORS: Record<PieceType | 'G', string> = {
  I: '#7cc6e8',
  O: '#f5cf5b',
  T: '#b692e0',
  S: '#8fd18a',
  Z: '#f08f8f',
  J: '#7f9bea',
  L: '#f2a65a',
  G: '#b9a78f',
};

/** Cells ([x, y]) of a piece type in a rotation state. */
export function pieceCells(type: PieceType, rot: number): [number, number][] {
  const { n, cells } = SHAPES[type];
  let out = cells;
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) out = out.map(([x, y]) => [n - 1 - y, x] as [number, number]);
  return out;
}

export interface ActivePiece {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export interface BlockDropConfig {
  goalLines: number;
  pieceLimit: number;
  gravityMs: number;
  garbageRows: number;
}

export function blockDropConfigForTier(tier: number): BlockDropConfig {
  const goalLines = Math.min(12, 6 + Math.floor(tier / 3));
  return {
    goalLines,
    pieceLimit: goalLines * 4 + 14,
    gravityMs: Math.max(380, 900 - tier * 25),
    garbageRows: Math.min(5, Math.floor(tier / 2)),
  };
}

export class BlockDropGame {
  board: (PieceType | 'G' | null)[];
  current: ActivePiece;
  queue: PieceType[] = [];
  hold: PieceType | null = null;
  holdUsed = false;
  lines = 0;
  piecesUsed = 0;
  over = false;
  toppedOut = false;
  private rng: Rng;

  constructor(
    public config: BlockDropConfig,
    seed: number,
  ) {
    this.rng = createRng(seed);
    this.board = new Array(WIDTH * HEIGHT).fill(null);
    for (let r = 0; r < config.garbageRows; r++) {
      const y = HEIGHT - 1 - r;
      const holes = new Set([this.rng.int(WIDTH)]);
      if (this.rng.next() < 0.35) holes.add(this.rng.int(WIDTH));
      for (let x = 0; x < WIDTH; x++) if (!holes.has(x)) this.board[y * WIDTH + x] = 'G';
    }
    this.refill();
    this.current = this.spawnPiece(this.queue.shift()!);
  }

  private refill() {
    while (this.queue.length < 7) this.queue.push(...this.rng.shuffle([...PIECE_TYPES]));
  }

  private spawnPiece(type: PieceType): ActivePiece {
    return { type, rot: 0, x: type === 'O' ? 4 : 3, y: 0 };
  }

  get piecesLeft() {
    return Math.max(0, this.config.pieceLimit - this.piecesUsed);
  }

  collides(piece: ActivePiece): boolean {
    return pieceCells(piece.type, piece.rot).some(([cx, cy]) => {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (x < 0 || x >= WIDTH || y >= HEIGHT) return true;
      return y >= 0 && this.board[y * WIDTH + x] !== null;
    });
  }

  move(dx: number): boolean {
    if (this.over) return false;
    const next = { ...this.current, x: this.current.x + dx };
    if (this.collides(next)) return false;
    this.current = next;
    return true;
  }

  rotate(dir: 1 | -1 = 1): boolean {
    if (this.over) return false;
    const rot = this.current.rot + dir;
    for (const [dx, dy] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
    ]) {
      const next = { ...this.current, rot, x: this.current.x + dx, y: this.current.y + dy };
      if (!this.collides(next)) {
        this.current = next;
        return true;
      }
    }
    return false;
  }

  /** Moves down one row; locks the piece if it can't. Returns true if it moved. */
  step(): boolean {
    if (this.over) return false;
    const next = { ...this.current, y: this.current.y + 1 };
    if (!this.collides(next)) {
      this.current = next;
      return true;
    }
    this.lock();
    return false;
  }

  hardDrop(): void {
    if (this.over) return;
    while (this.step()) {
      /* keep falling */
    }
  }

  ghostY(): number {
    let y = this.current.y;
    while (!this.collides({ ...this.current, y: y + 1 })) y++;
    return y;
  }

  holdPiece(): void {
    if (this.over || this.holdUsed) return;
    const prev = this.hold;
    this.hold = this.current.type;
    this.holdUsed = true;
    if (prev) {
      this.current = this.spawnPiece(prev);
    } else {
      this.refill();
      this.current = this.spawnPiece(this.queue.shift()!);
    }
  }

  private lock() {
    for (const [cx, cy] of pieceCells(this.current.type, this.current.rot)) {
      const y = this.current.y + cy;
      if (y < 0) {
        this.over = true;
        this.toppedOut = true;
        return;
      }
      this.board[y * WIDTH + this.current.x + cx] = this.current.type;
    }
    this.piecesUsed++;
    this.clearLines();
    if (this.lines >= this.config.goalLines || this.piecesUsed >= this.config.pieceLimit) {
      this.over = true;
      return;
    }
    this.refill();
    this.current = this.spawnPiece(this.queue.shift()!);
    this.holdUsed = false;
    if (this.collides(this.current)) {
      this.over = true;
      this.toppedOut = true;
    }
  }

  private clearLines() {
    const rows: (PieceType | 'G' | null)[][] = [];
    for (let y = 0; y < HEIGHT; y++) rows.push(this.board.slice(y * WIDTH, (y + 1) * WIDTH));
    const kept = rows.filter((row) => row.some((c) => c === null));
    const cleared = HEIGHT - kept.length;
    if (!cleared) return;
    this.lines += cleared;
    const empty = Array.from({ length: cleared }, () => new Array(WIDTH).fill(null));
    this.board = [...empty, ...kept].flat();
  }

  stars(): 0 | 1 | 2 | 3 {
    const goal = this.config.goalLines;
    if (this.lines >= goal) return 3;
    if (this.lines >= Math.ceil(goal * 0.6)) return 2;
    if (this.lines >= Math.ceil(goal * 0.3)) return 1;
    return 0;
  }
}
