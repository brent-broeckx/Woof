import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import type { MiniGameProps } from '../registry';
import './nonogramPaws.css';
import {
  applyNonogramCell,
  createNonogramPawsState,
  generateNonogramPawsPuzzle,
  isLineSatisfied,
  isNonogramComplete,
  nonogramPawsConfigForTier,
  nonogramPawsStars,
  setNonogramMode,
  type NonogramPawsState,
} from './logic';

export default function NonogramPawsView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateNonogramPawsPuzzle(nonogramPawsConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState(() => createNonogramPawsState(puzzle));
  const boardRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const drag = useRef<{ action: 'fill' | 'mark'; value: 'filled' | 'empty' | 'unknown' | 'mistake'; last: number } | null>(null);

  const finishIfDone = (next: NonogramPawsState) => {
    if (!isNonogramComplete(next) || finished.current) return;
    finished.current = true;
    const stars = nonogramPawsStars(next.mistakes);
    window.setTimeout(() => onFinish({ stars, summary: `${next.mistakes} mistakes · ${next.puzzle.name}` }), 700);
  };

  const cellAt = (event: PointerEvent) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return -1;
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * puzzle.size);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * puzzle.size);
    return row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size ? -1 : row * puzzle.size + col;
  };

  const paint = (index: number, action: 'fill' | 'mark') => {
    setState((current) => {
      const next = applyNonogramCell(current, index, action);
      finishIfDone(next);
      return next;
    });
  };

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const index = cellAt(event);
    if (index < 0 || finished.current) return;
    try {
      boardRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic pointers cannot always be captured */
    }
    const action = event.button === 2 || event.altKey || event.ctrlKey ? 'mark' : state.mode;
    drag.current = { action, value: state.cells[index], last: index };
    paint(index, action);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || finished.current) return;
    const index = cellAt(event);
    if (index < 0 || index === current.last) return;
    current.last = index;
    if (state.cells[index] === current.value || current.value === 'unknown') paint(index, current.action);
  };

  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="minigame nonogramPaws-game">
      <div className="mg-stats">
        <span>
          🐾 {puzzle.size}×{puzzle.size}
        </span>
        <span>❌ {state.mistakes} mistakes</span>
        <span>🎨 {puzzle.name}</span>
      </div>
      <div className={`np-wrap ${isNonogramComplete(state) ? 'complete' : ''}`} style={{ ['--n' as string]: puzzle.size }}>
        <div className="np-corner">
          <DogFace breed={seed % 11} mood="happy" />
        </div>
        <div className="np-col-clues">
          {puzzle.colClues.map((clue, index) => (
            <div key={index} className={isLineSatisfied(state, 'col', index) ? 'satisfied' : ''}>
              {clue.length ? clue.join(' ') : '0'}
            </div>
          ))}
        </div>
        <div className="np-row-clues">
          {puzzle.rowClues.map((clue, index) => (
            <div key={index} className={isLineSatisfied(state, 'row', index) ? 'satisfied' : ''}>
              {clue.length ? clue.join(' ') : '0'}
            </div>
          ))}
        </div>
        <div
          ref={boardRef}
          className="np-board"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {state.cells.map((cell, index) => (
            <button key={index} className={`np-cell ${cell}`} aria-label={`Cell ${index + 1}`} onClick={(event) => event.preventDefault()}>
              {(cell === 'empty' || cell === 'mistake') && <span>×</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="mg-actions">
        <button className={`btn ${state.mode === 'fill' ? 'primary' : ''}`} onClick={() => setState((s) => setNonogramMode(s, 'fill'))}>
          Fill
        </button>
        <button className={`btn ${state.mode === 'mark' ? 'primary' : ''}`} onClick={() => setState((s) => setNonogramMode(s, 'mark'))}>
          Mark X
        </button>
        <button className="btn ghost" onClick={() => setState(createNonogramPawsState(puzzle))}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
