/**
 * Offline level generator: builds every puzzle slot defined in src/core/progression/levels.ts
 * and writes src/data/puzzles.json. Run with `npm run generate-levels`.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generatePuzzle, puzzleKey, type GeneratedPuzzle } from '../src/core/puzzle/generator';
import { puzzleSlots, type PuzzleSlot } from '../src/core/progression/levels';
import { encodePuzzle } from '../src/core/puzzle/levelData';
import { createRng } from '../src/core/rng';

const rng = createRng(20260930);

const POOL_SIZE = 120;
const start = Date.now();
const slots = puzzleSlots();
const pools = new Map<string, GeneratedPuzzle[]>();
const usedKeys = new Set<string>();

function poolFor(slot: PuzzleSlot): GeneratedPuzzle[] {
  const key = `${slot.size}:${slot.maxDifficulty}`;
  let pool = pools.get(key);
  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = generatePuzzle({ size: slot.size, seed: slot.size * 100_000 + slot.maxDifficulty * 10_000 + i, maxDifficulty: slot.maxDifficulty });
      if (p) pool.push(p);
    }
    pool.sort((a, b) => a.difficulty.score - b.difficulty.score);
    pools.set(key, pool);
  }
  return pool;
}

function pick(slot: PuzzleSlot): GeneratedPuzzle {
  const pool = poolFor(slot).filter((p) => !usedKeys.has(puzzleKey(p)));
  if (!pool.length) throw new Error(`Pool exhausted for slot ${slot.levelId}`);
  let chosen: GeneratedPuzzle;
  if (slot.role === 'tutorial' || slot.role === 'easy') {
    chosen = pool[Math.floor(pool.length * (slot.role === 'tutorial' ? 0 : 0.15))];
  } else if (slot.role === 'medium') {
    chosen = pool[Math.floor(pool.length * (0.35 + rng.next() * 0.3))];
  } else {
    // Hard: prefer puzzles that need the world's hardest techniques, then highest score.
    const ranked = [...pool].sort((a, b) => b.difficulty.maxDifficulty - a.difficulty.maxDifficulty || b.difficulty.score - a.difficulty.score);
    chosen = ranked[Math.floor(rng.next() * Math.min(4, ranked.length))];
  }
  usedKeys.add(puzzleKey(chosen));
  return chosen;
}

const puzzles = slots.map((slot) => {
  const p = pick(slot);
  return encodePuzzle({ ...p, id: slot.puzzleIndex });
});

const out = fileURLToPath(new URL('../src/data/puzzles.json', import.meta.url));
writeFileSync(out, JSON.stringify(puzzles, null, 0).replace(/\},\{/g, '},\n{') + '\n');
const summary = slots.map((s, i) => `${s.levelId}:${s.size}x${s.size}/${puzzles[i].difficulty.maxTechnique}`);
console.log(summary.join('  '));
console.log(`Wrote ${puzzles.length} puzzles in ${((Date.now() - start) / 1000).toFixed(1)}s → ${out}`);
