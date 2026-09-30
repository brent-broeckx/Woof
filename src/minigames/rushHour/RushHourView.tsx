import { useEffect, useMemo, useRef, useState } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import { REGION_COLORS } from '../../ui/colors';
import type { MiniGameProps } from '../registry';
import {
  applyRushMove,
  createRushState,
  generateRushHourPuzzle,
  isRushSolved,
  resetRush,
  rushHourConfigForTier,
  rushHourStars,
  rushLegalMoves,
  rushOccupancy,
  undoRush,
  type RushState,
} from './logic';
import './rushHour.css';

export default function RushHourView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateRushHourPuzzle(rushHourConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState<RushState>(() => createRushState(puzzle));
  const [selected, setSelected] = useState(0);
  const drag = useRef<{ vehicle: number; startCell: number } | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!isRushSolved(state.puzzle, state.positions) || finished.current) return;
    finished.current = true;
    const stars = rushHourStars(state.moves, state.puzzle.optimal);
    window.setTimeout(() => onFinish({ stars, summary: `${state.moves} moves (optimal ${state.puzzle.optimal})` }), 750);
  }, [state, onFinish]);

  const moveSelected = (delta: number) => {
    if (finished.current) return;
    const to = state.positions[selected] + delta;
    setState((s) => applyRushMove(s, selected, to));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const vehicle = puzzle.vehicles[selected];
    if (vehicle.dir === 'h') {
      if (event.key === 'ArrowLeft') moveSelected(-1);
      if (event.key === 'ArrowRight') moveSelected(1);
    } else {
      if (event.key === 'ArrowUp') moveSelected(-1);
      if (event.key === 'ArrowDown') moveSelected(1);
    }
  };

  const occ = rushOccupancy(puzzle, state.positions);
  const legal = rushLegalMoves(puzzle, state.positions);

  return (
    <div className="minigame rushHour-game">
      <div className="mg-stats">
        <span>👣 {state.moves} moves</span>
        <span>🎯 optimal {puzzle.optimal}</span>
        {puzzle.relaxed && <span>🐾 relaxed</span>}
      </div>
      <div className="rush-board" tabIndex={0} onKeyDown={onKeyDown} aria-label="Doggy Rush Hour board">
        <div className="rush-exit" />
        {puzzle.vehicles.map((vehicle, i) => {
          const pos = state.positions[i];
          const row = vehicle.dir === 'h' ? vehicle.row : pos;
          const col = vehicle.dir === 'h' ? pos : vehicle.col;
          return (
            <button
              key={vehicle.id}
              className={`rush-vehicle ${i === 0 ? 'dog-van' : 'crate'} ${selected === i ? 'selected' : ''}`}
              style={{
                ['--row' as string]: row,
                ['--col' as string]: col,
                ['--w' as string]: vehicle.dir === 'h' ? vehicle.length : 1,
                ['--h' as string]: vehicle.dir === 'v' ? vehicle.length : 1,
                background: i === 0 ? '#f4c56a' : REGION_COLORS[vehicle.color % REGION_COLORS.length],
              }}
              onPointerDown={(event) => {
                setSelected(i);
                const rect = event.currentTarget.closest('.rush-board')?.getBoundingClientRect();
                if (!rect) return;
                const cellSize = rect.width / puzzle.size;
                const cell = Math.floor((event.clientY - rect.top) / cellSize) * puzzle.size + Math.floor((event.clientX - rect.left) / cellSize);
                drag.current = { vehicle: i, startCell: cell };
                try {
                  event.currentTarget.setPointerCapture(event.pointerId);
                } catch {
                  // Safari may reject capture after quick taps.
                }
              }}
              onPointerUp={(event) => {
                const start = drag.current;
                drag.current = null;
                if (!start || start.vehicle !== i || finished.current) return;
                const rect = event.currentTarget.closest('.rush-board')?.getBoundingClientRect();
                if (!rect) return;
                const cellSize = rect.width / puzzle.size;
                const endCell = Math.floor((event.clientY - rect.top) / cellSize) * puzzle.size + Math.floor((event.clientX - rect.left) / cellSize);
                const delta =
                  vehicle.dir === 'h'
                    ? (endCell % puzzle.size) - (start.startCell % puzzle.size)
                    : Math.floor(endCell / puzzle.size) - Math.floor(start.startCell / puzzle.size);
                if (delta === 0) return;
                const direction = Math.sign(delta);
                const candidates = legal.filter((m) => m.vehicle === i && Math.sign(m.to - state.positions[i]) === direction);
                const best = candidates.reduce<number | null>((choice, m) => {
                  if (choice === null) return m.to;
                  return Math.abs(m.to - state.positions[i]) <= Math.abs(delta) && Math.abs(m.to - state.positions[i]) > Math.abs(choice - state.positions[i])
                    ? m.to
                    : choice;
                }, null);
                if (best !== null) setState((s) => applyRushMove(s, i, best));
              }}
              aria-label={i === 0 ? 'Dog van' : `Vehicle ${i}`}
            >
              {i === 0 ? <DogFace breed={seed % 11} mood="calm" /> : <span>{vehicle.length === 3 ? '🚚' : '📦'}</span>}
            </button>
          );
        })}
        {occ.map((vehicle, cell) => (
          <span key={cell} className="rush-cell" data-filled={vehicle >= 0} />
        ))}
      </div>
      <div className="mg-actions">
        <button className="btn" onClick={() => setState((s) => undoRush(s))} disabled={!state.history.length}>
          Undo
        </button>
        <button className="btn ghost" onClick={() => setState((s) => resetRush(s))}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
