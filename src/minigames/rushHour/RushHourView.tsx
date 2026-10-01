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
  rushOccupancy,
  rushSlideRange,
  undoRush,
  type RushState,
} from './logic';
import './rushHour.css';

export default function RushHourView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateRushHourPuzzle(rushHourConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState<RushState>(() => createRushState(puzzle));
  const [selected, setSelected] = useState(0);
  const drag = useRef<{ vehicle: number; pointerId: number; start: number; pos: number; min: number; max: number; pitch: number } | null>(null);
  const [dragView, setDragView] = useState<{ vehicle: number; offset: number } | null>(null);
  const finished = useRef(false);
  const solved = isRushSolved(state.puzzle, state.positions);

  useEffect(() => {
    if (!solved || finished.current) return;
    finished.current = true;
    const stars = rushHourStars(state.moves, state.puzzle.optimal);
    window.setTimeout(() => onFinish({ stars, summary: `${state.moves} moves (optimal ${state.puzzle.optimal})` }), 950);
  }, [solved, state, onFinish]);

  const moveSelected = (delta: number) => {
    if (finished.current) return;
    const to = state.positions[selected] + delta;
    setState((s) => applyRushMove(s, selected, to));
  };

  const boardPitch = (el: Element) => {
    const board = el.closest('.rush-board') as HTMLElement | null;
    if (!board) return 0;
    const cs = getComputedStyle(board);
    const pad = parseFloat(cs.paddingLeft) || 0;
    const gap = parseFloat(cs.columnGap) || 0;
    return (board.getBoundingClientRect().width - 2 * pad + gap) / puzzle.size;
  };

  const onVehicleDown = (event: React.PointerEvent<HTMLButtonElement>, i: number) => {
    setSelected(i);
    if (finished.current || event.button > 0) return;
    const vehicle = puzzle.vehicles[i];
    const { min, max } = rushSlideRange(puzzle, state.positions, i);
    drag.current = {
      vehicle: i,
      pointerId: event.pointerId,
      start: vehicle.dir === 'h' ? event.clientX : event.clientY,
      pos: state.positions[i],
      min,
      max,
      pitch: boardPitch(event.currentTarget),
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers reject capture after very quick taps; window-free fallback still works for mouse.
    }
    setDragView({ vehicle: i, offset: 0 });
  };

  const onVehicleMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId || !d.pitch) return;
    const raw = (puzzle.vehicles[d.vehicle].dir === 'h' ? event.clientX : event.clientY) - d.start;
    const offset = Math.max((d.min - d.pos) * d.pitch, Math.min((d.max - d.pos) * d.pitch, raw));
    setDragView({ vehicle: d.vehicle, offset });
  };

  const onVehicleUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    drag.current = null;
    const offset = dragView?.vehicle === d.vehicle ? dragView.offset : 0;
    setDragView(null);
    if (!d.pitch || finished.current) return;
    let steps = Math.round(offset / d.pitch);
    // A short, deliberate flick still moves one cell.
    if (steps === 0 && Math.abs(offset) > d.pitch * 0.3) steps = Math.sign(offset);
    const to = Math.max(d.min, Math.min(d.max, d.pos + steps));
    if (to !== d.pos) setState((s) => applyRushMove(s, d.vehicle, to));
  };

  const onVehicleCancel = () => {
    drag.current = null;
    setDragView(null);
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

  return (
    <div className="minigame rushHour-game">
      <div className="mg-stats">
        <span>👣 {state.moves} moves</span>
        <span>🎯 optimal {puzzle.optimal}</span>
        {puzzle.relaxed && <span>🐾 relaxed</span>}
      </div>
      <div className="rush-frame">
        <div className="rush-board" tabIndex={0} onKeyDown={onKeyDown} aria-label="Doggy Rush Hour board">
          <div className="rush-exit" aria-hidden="true">
            <span>EXIT</span>
            <b>➜</b>
          </div>
          {puzzle.vehicles.map((vehicle, i) => {
            const pos = state.positions[i];
            const row = vehicle.dir === 'h' ? vehicle.row : pos;
            const col = vehicle.dir === 'h' ? pos : vehicle.col;
            return (
              <button
                key={vehicle.id}
                className={`rush-vehicle ${i === 0 ? 'dog-van' : 'crate'} ${selected === i ? 'selected' : ''} ${dragView?.vehicle === i ? 'dragging' : ''} ${i === 0 && solved ? 'escaping' : ''}`}
                style={{
                  ['--row' as string]: row,
                  ['--col' as string]: col,
                  ['--w' as string]: vehicle.dir === 'h' ? vehicle.length : 1,
                  ['--h' as string]: vehicle.dir === 'v' ? vehicle.length : 1,
                  background: i === 0 ? '#f4c56a' : REGION_COLORS[vehicle.color % REGION_COLORS.length],
                  transform:
                    dragView?.vehicle === i ? (vehicle.dir === 'h' ? `translateX(${dragView.offset}px)` : `translateY(${dragView.offset}px)`) : undefined,
                }}
                onPointerDown={(event) => onVehicleDown(event, i)}
                onPointerMove={onVehicleMove}
                onPointerUp={onVehicleUp}
                onPointerCancel={onVehicleCancel}
                onLostPointerCapture={(event) => {
                  if (drag.current?.pointerId === event.pointerId) onVehicleUp(event);
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
