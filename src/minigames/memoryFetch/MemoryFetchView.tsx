import { useEffect, useMemo, useRef, useState } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import type { MiniGameProps } from '../registry';
import {
  createMemoryState,
  flipMemoryCard,
  generateMemoryPuzzle,
  memoryFetchConfigForTier,
  memoryFetchStars,
  memoryPairs,
  resolveMemoryMismatch,
} from './logic';
import './memoryFetch.css';

export default function MemoryFetchView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateMemoryPuzzle(memoryFetchConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState(() => createMemoryState(puzzle));
  const finished = useRef(false);
  const pairs = memoryPairs(puzzle);

  useEffect(() => {
    if (!state.locked) return;
    const timer = window.setTimeout(() => setState((s) => resolveMemoryMismatch(s)), 800);
    return () => window.clearTimeout(timer);
  }, [state.locked, state.misses]);

  useEffect(() => {
    if (!state.won || finished.current) return;
    finished.current = true;
    const timer = window.setTimeout(() => onFinish({ stars: memoryFetchStars(state), summary: `${state.misses} misses across ${pairs} pairs` }), 700);
    return () => window.clearTimeout(timer);
  }, [onFinish, pairs, state]);

  return (
    <div className="minigame memoryFetch-game">
      <div className="mg-stats">
        <span>
          🐶 {state.cards.filter((c) => c.kind === 'dog' && c.matched).length / 2}/{pairs} pairs
        </span>
        <span>🙈 {state.misses} misses</span>
        <span>🔄 {state.attempts} flips</span>
      </div>
      <div className="memory-notice" aria-live="polite">
        {state.lastSwap
          ? `Two sneaky pups swapped kennels: ${state.lastSwap[0] + 1} ↔ ${state.lastSwap[1] + 1}`
          : puzzle.swapAfterMisses
            ? 'After 4 misses in a row, two hidden cards swap.'
            : 'Find every matching breed.'}
      </div>
      <div className="memory-grid" style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)` }}>
        {state.cards.map((card, i) => {
          const shown = card.faceUp || card.matched;
          return (
            <button
              key={`${card.id}-${i}`}
              className={`memory-card ${shown ? 'shown' : ''} ${card.matched ? 'matched' : ''}`}
              disabled={state.locked || shown || state.won}
              onClick={() => setState((s) => flipMemoryCard(s, i))}
            >
              <span className="memory-card-inner">
                <span className="memory-card-back">?</span>
                <span className="memory-card-front">
                  {card.kind === 'bone' ? <span className="memory-bone">🦴</span> : <DogFace breed={card.breed} mood={card.matched ? 'happy' : 'calm'} />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mg-actions">
        <button className="btn" onClick={() => setState(createMemoryState(puzzle))}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
