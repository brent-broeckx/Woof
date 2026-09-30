import type { Puzzle } from '../core/puzzle/types';
import type { GenerateRequest } from '../workers/generate';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (r: { puzzle?: Puzzle; error?: string }) => void>();

/** Generate a puzzle off the main thread (falls back to the main thread without Worker support). */
export async function generateInWorker(req: Omit<GenerateRequest, 'id'>): Promise<Puzzle> {
  if (typeof Worker === 'undefined') {
    const { generateReliably } = await import('../workers/generate');
    return generateReliably(req);
  }
  if (!worker) {
    worker = new Worker(new URL('../workers/generator.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
  }
  const id = ++nextId;
  const res = await new Promise<{ puzzle?: Puzzle; error?: string }>((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ id, ...req });
  });
  if (!res.puzzle) throw new Error(res.error ?? 'generation failed');
  return res.puzzle;
}
