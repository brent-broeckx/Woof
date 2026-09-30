import { createRng } from '../../core/rng';

export type NonogramMark = 'unknown' | 'filled' | 'empty' | 'mistake';

export interface NonogramPicture {
  id: string;
  name: string;
  pixels: string[];
}

export interface NonogramPawsConfig {
  size: 5 | 6 | 7 | 8;
}

export interface NonogramPuzzle {
  id: string;
  name: string;
  size: 5 | 6 | 7 | 8;
  solution: boolean[];
  rowClues: number[][];
  colClues: number[][];
}

export interface NonogramPawsState {
  puzzle: NonogramPuzzle;
  cells: NonogramMark[];
  mode: 'fill' | 'mark';
  mistakes: number;
  moves: number;
}

export const AUTHORED_PICTURES: NonogramPicture[] = [
  { id: 'paw5', name: 'Paw print', pixels: ['.#.#.', '#####', '.###.', '..#..', '.....'] },
  { id: 'bone5', name: 'Bone', pixels: ['##.##', '#####', '.###.', '#####', '##.##'] },
  { id: 'heart5', name: 'Heart', pixels: ['.#.#.', '#####', '#####', '.###.', '..#..'] },
  { id: 'ball6', name: 'Ball', pixels: ['.####.', '######', '##..##', '##..##', '######', '.####.'] },
  { id: 'house6', name: 'Dog house', pixels: ['..##..', '.####.', '######', '.####.', '.#..#.', '.####.'] },
  { id: 'dog6', name: 'Dog face', pixels: ['.####.', '######', '##.###', '######', '.####.', '.#..#.'] },
  { id: 'bone6', name: 'Big bone', pixels: ['##..##', '######', '.####.', '.####.', '######', '##..##'] },
  { id: 'tail7', name: 'Wagging tail', pixels: ['...##..', '..####.', '.###...', '.##....', '.###...', '..####.', '...##..'] },
  { id: 'hydrant7', name: 'Fire hydrant', pixels: ['..###..', '.#####.', '..###..', '#######', '..###..', '.#####.', '.#...#.'] },
  { id: 'pup7', name: 'Puppy', pixels: ['.#####.', '#######', '##.#.##', '#######', '.#####.', '..###..', '.#...#.'] },
  { id: 'treat7', name: 'Treat', pixels: ['..###..', '.#####.', '#######', '###.###', '#######', '.#####.', '..###..'] },
  { id: 'kennel8', name: 'Kennel', pixels: ['...##...', '..####..', '.######.', '########', '##....##', '##.##.##', '##.##.##', '########'] },
  { id: 'doghead8', name: 'Dog head', pixels: ['.######.', '########', '##.##.##', '########', '###..###', '.######.', '..####..', '.#....#.'] },
  { id: 'paw8', name: 'Big paw', pixels: ['..##.##.', '.#######', '########', '.######.', '..####..', '...##...', '.##..##.', '.##..##.'] },
  { id: 'collar8', name: 'Collar tag', pixels: ['########', '#......#', '#.####.#', '#.####.#', '#.####.#', '#..##..#', '#......#', '########'] },
];

export function nonogramPawsConfigForTier(tier: number): NonogramPawsConfig {
  if (tier <= 5) return { size: 5 };
  if (tier <= 9) return { size: 6 };
  if (tier <= 14) return { size: 7 };
  return { size: 8 };
}

export function lineClues(line: readonly boolean[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const filled of line) {
    if (filled) run++;
    else if (run) {
      clues.push(run);
      run = 0;
    }
  }
  if (run) clues.push(run);
  return clues;
}

function mirrorPixels(pixels: readonly string[]): string[] {
  return pixels.map((row) => [...row].reverse().join(''));
}

export function pictureToPuzzle(picture: NonogramPicture, mirrored = false): NonogramPuzzle {
  const pixels = mirrored ? mirrorPixels(picture.pixels) : picture.pixels;
  const size = pixels.length as 5 | 6 | 7 | 8;
  const solution = pixels.flatMap((row) => [...row].map((ch) => ch === '#'));
  const rowClues = pixels.map((row) => lineClues([...row].map((ch) => ch === '#')));
  const colClues = Array.from({ length: size }, (_, c) => lineClues(pixels.map((row) => row[c] === '#')));
  return { id: mirrored ? `${picture.id}-mirror` : picture.id, name: picture.name, size, solution, rowClues, colClues };
}

export function generateNonogramPawsPuzzle(config: NonogramPawsConfig, seed: number): NonogramPuzzle {
  const rng = createRng(seed);
  const candidates = AUTHORED_PICTURES.filter((picture) => picture.pixels.length === config.size && isLineSolvable(pictureToPuzzle(picture)));
  const picture = rng.pick(candidates.length ? candidates : AUTHORED_PICTURES.filter((p) => p.pixels.length === config.size));
  return pictureToPuzzle(picture, rng.next() < 0.5);
}

export function createNonogramPawsState(puzzle: NonogramPuzzle): NonogramPawsState {
  return { puzzle, cells: new Array(puzzle.size * puzzle.size).fill('unknown'), mode: 'fill', mistakes: 0, moves: 0 };
}

function enumerateLine(length: number, clues: readonly number[], known: readonly NonogramMark[]): number[] {
  const masks: number[] = [];
  const groups = clues.length ? [...clues] : [];
  const rec = (groupIndex: number, pos: number, mask: number) => {
    if (groupIndex === groups.length) {
      for (let i = pos; i < length; i++) if (known[i] === 'filled') return;
      masks.push(mask);
      return;
    }
    const group = groups[groupIndex];
    const rest = groups.slice(groupIndex + 1).reduce((sum, g) => sum + g, 0) + Math.max(0, groups.length - groupIndex - 1);
    for (let start = pos; start <= length - group - rest; start++) {
      let ok = true;
      for (let i = pos; i < start; i++) if (known[i] === 'filled') ok = false;
      for (let i = start; i < start + group; i++) if (known[i] === 'empty' || known[i] === 'mistake') ok = false;
      if (!ok) continue;
      let nextPos = start + group;
      if (groupIndex < groups.length - 1) {
        if (nextPos >= length || known[nextPos] === 'filled') continue;
        nextPos++;
      }
      let nextMask = mask;
      for (let i = start; i < start + group; i++) nextMask |= 1 << i;
      rec(groupIndex + 1, nextPos, nextMask);
    }
  };
  rec(0, 0, 0);
  return masks;
}

export function solveByLineLogic(puzzle: NonogramPuzzle): NonogramMark[] | null {
  const { size } = puzzle;
  const cells: NonogramMark[] = new Array(size * size).fill('unknown');
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < size; r++) {
      const known = Array.from({ length: size }, (_, c) => cells[r * size + c]);
      const masks = enumerateLine(size, puzzle.rowClues[r], known);
      if (!masks.length) return null;
      const filledEverywhere = masks.reduce((acc, mask) => acc & mask, (1 << size) - 1);
      const filledSomewhere = masks.reduce((acc, mask) => acc | mask, 0);
      for (let c = 0; c < size; c++) {
        const next: NonogramMark = filledEverywhere & (1 << c) ? 'filled' : filledSomewhere & (1 << c) ? 'unknown' : 'empty';
        if (next !== 'unknown' && cells[r * size + c] === 'unknown') {
          cells[r * size + c] = next;
          changed = true;
        }
      }
    }
    for (let c = 0; c < size; c++) {
      const known = Array.from({ length: size }, (_, r) => cells[r * size + c]);
      const masks = enumerateLine(size, puzzle.colClues[c], known);
      if (!masks.length) return null;
      const filledEverywhere = masks.reduce((acc, mask) => acc & mask, (1 << size) - 1);
      const filledSomewhere = masks.reduce((acc, mask) => acc | mask, 0);
      for (let r = 0; r < size; r++) {
        const next: NonogramMark = filledEverywhere & (1 << r) ? 'filled' : filledSomewhere & (1 << r) ? 'unknown' : 'empty';
        if (next !== 'unknown' && cells[r * size + c] === 'unknown') {
          cells[r * size + c] = next;
          changed = true;
        }
      }
    }
  }
  return cells;
}

export function isLineSolvable(puzzle: NonogramPuzzle): boolean {
  const solved = solveByLineLogic(puzzle);
  return solved !== null && solved.every((cell, index) => (puzzle.solution[index] ? cell === 'filled' : cell === 'empty'));
}

export function setNonogramMode(state: NonogramPawsState, mode: 'fill' | 'mark'): NonogramPawsState {
  return { ...state, mode };
}

export function applyNonogramCell(state: NonogramPawsState, index: number, action = state.mode): NonogramPawsState {
  if (state.cells[index] === 'filled' || state.cells[index] === 'mistake') return state;
  const cells = [...state.cells];
  let mistakes = state.mistakes;
  if (action === 'fill') {
    if (state.puzzle.solution[index]) cells[index] = 'filled';
    else {
      cells[index] = 'mistake';
      mistakes++;
    }
  } else {
    cells[index] = cells[index] === 'empty' ? 'unknown' : 'empty';
  }
  return { ...state, cells, mistakes, moves: state.moves + 1 };
}

export function isNonogramComplete(state: NonogramPawsState): boolean {
  return state.puzzle.solution.every((filled, index) => !filled || state.cells[index] === 'filled');
}

export function isLineSatisfied(state: NonogramPawsState, line: 'row' | 'col', index: number): boolean {
  const { puzzle } = state;
  const cells = Array.from({ length: puzzle.size }, (_, i) => {
    const at = line === 'row' ? index * puzzle.size + i : i * puzzle.size + index;
    return state.cells[at] === 'filled';
  });
  return JSON.stringify(lineClues(cells)) === JSON.stringify(line === 'row' ? puzzle.rowClues[index] : puzzle.colClues[index]);
}

export function nonogramPawsStars(mistakes: number): 1 | 2 | 3 {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}
