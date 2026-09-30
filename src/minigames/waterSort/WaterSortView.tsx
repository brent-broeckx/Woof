import { useMemo, useRef, useState } from 'react';
import { LEASH_COLORS } from '../../ui/colors';
import type { MiniGameProps } from '../registry';
import './waterSort.css';
import {
  createWaterSortState,
  generateWaterSortPuzzle,
  isWaterSortSolved,
  resetWaterSort,
  selectOrPour,
  undoWaterSort,
  waterSortConfigForTier,
  waterSortStars,
  type Bowl,
  type WaterSortState,
} from './logic';

function BowlView({ bowl, capacity, selected, onClick }: { bowl: Bowl; capacity: number; selected: boolean; onClick(): void }) {
  const layers = Array.from({ length: capacity }, (_, i) => bowl[capacity - 1 - i]);
  return (
    <button className={`ws-bowl ${selected ? 'selected' : ''}`} onClick={onClick} aria-label="Water bowl">
      <div className="ws-glass">
        {layers.map((color, index) => (
          <div key={index} className="ws-layer" style={{ background: color === undefined ? 'transparent' : LEASH_COLORS[color % LEASH_COLORS.length] }} />
        ))}
      </div>
    </button>
  );
}

export default function WaterSortView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateWaterSortPuzzle(waterSortConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState(() => createWaterSortState(puzzle));
  const finished = useRef(false);

  const finishIfDone = (next: WaterSortState) => {
    if (!isWaterSortSolved(next.bowls, next.puzzle.capacity) || finished.current) return;
    finished.current = true;
    const stars = waterSortStars(next.pours, next.puzzle.target);
    window.setTimeout(() => onFinish({ stars, summary: `${next.pours} pours (target ${next.puzzle.target})` }), 700);
  };

  const tap = (index: number) => {
    if (finished.current) return;
    setState((current) => {
      const next = selectOrPour(current, index);
      finishIfDone(next);
      return next;
    });
  };

  return (
    <div className="minigame waterSort-game">
      <div className="mg-stats">
        <span>🥣 {puzzle.colors} colours</span>
        <span>💧 {state.pours} pours</span>
        <span>🎯 target {puzzle.target}</span>
      </div>
      <div className="ws-rack">
        {state.bowls.map((bowl, index) => (
          <BowlView key={index} bowl={bowl} capacity={puzzle.capacity} selected={state.selected === index} onClick={() => tap(index)} />
        ))}
      </div>
      <div className="mg-actions">
        <button className="btn" disabled={!state.history.length || finished.current} onClick={() => setState((s) => undoWaterSort(s))}>
          Undo
        </button>
        <button className="btn ghost" disabled={finished.current} onClick={() => setState((s) => resetWaterSort(s))}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
