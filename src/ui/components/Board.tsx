import { memo, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent } from 'react';
import { colOf, neighbors, rowOf } from '../../core/puzzle/geometry';
import type { GameAction, GameState } from '../../core/puzzle/game';
import type { Settings } from '../../store/saveStore';
import { REGION_COLORS } from '../colors';
import { DogFace } from './DogFace';

interface BoardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  settings: Settings;
  /** When set, the next tap selects a target instead of playing. */
  onTarget?: ((cell: number) => void) | null;
}

const DOUBLE_TAP_MS = 320;
const LONG_PRESS_MS = 450;

export const Board = memo(function Board({ state, dispatch, settings, onTarget }: BoardProps) {
  const { puzzle, marks } = state;
  const { size, regions } = puzzle;
  const boardRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const marksRef = useRef(marks);
  marksRef.current = marks;

  const gesture = useRef({
    down: false,
    start: -1,
    last: -1,
    dragging: false,
    paintValue: true,
    longTimer: 0 as number | ReturnType<typeof setTimeout>,
    longFired: false,
    lastTapCell: -1,
    lastTapTime: 0,
  });

  const placeDog = useCallback(
    (cell: number) => {
      dispatch({ type: 'placeDog', cell, autoCross: settings.autoCross });
      navigator.vibrate?.(15);
    },
    [dispatch, settings.autoCross],
  );

  const cellFromEvent = (e: PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell]');
    if (!el || !boardRef.current?.contains(el)) return -1;
    return Number(el.dataset.cell);
  };

  const tap = (cell: number) => {
    const g = gesture.current;
    if (marksRef.current[cell] === 'dog') return;
    if (settings.placementMode === 'dog') {
      placeDog(cell);
      return;
    }
    const now = performance.now();
    if (g.lastTapCell === cell && now - g.lastTapTime < DOUBLE_TAP_MS) {
      dispatch({ type: 'undo' });
      placeDog(cell);
      g.lastTapCell = -1;
      return;
    }
    dispatch({ type: 'toggleX', cell });
    g.lastTapCell = cell;
    g.lastTapTime = now;
  };

  const cellsBetween = (a: number, b: number): number[] => {
    const [ar, ac, br, bc] = [rowOf(a, size), colOf(a, size), rowOf(b, size), colOf(b, size)];
    const steps = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
    const out: number[] = [];
    for (let i = 1; i <= steps; i++) {
      const r = Math.round(ar + ((br - ar) * i) / steps);
      const c = Math.round(ac + ((bc - ac) * i) / steps);
      out.push(r * size + c);
    }
    return out;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return;
    const cell = cellFromEvent(e);
    if (cell < 0) return;
    e.preventDefault();
    if (onTarget) {
      onTarget(cell);
      return;
    }
    if (state.status !== 'playing') return;
    boardRef.current?.setPointerCapture(e.pointerId);
    const g = gesture.current;
    g.down = true;
    g.start = cell;
    g.last = cell;
    g.dragging = false;
    g.longFired = false;
    clearTimeout(g.longTimer);
    g.longTimer = setTimeout(() => {
      if (g.down && !g.dragging && marksRef.current[cell] !== 'dog') {
        g.longFired = true;
        placeDog(cell);
      }
    }, LONG_PRESS_MS);
    setCursor(null);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g.down) return;
    const cell = cellFromEvent(e);
    if (cell < 0 || cell === g.last) return;
    const path = cellsBetween(g.last, cell);
    if (!g.dragging) {
      g.dragging = true;
      clearTimeout(g.longTimer);
      g.paintValue = marksRef.current[g.start] === 'empty';
      dispatch({ type: 'paint', cells: [g.start, ...path], value: g.paintValue, newStroke: true });
    } else {
      dispatch({ type: 'paint', cells: path, value: g.paintValue, newStroke: false });
    }
    g.last = cell;
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (!g.down) return;
    g.down = false;
    clearTimeout(g.longTimer);
    if (!g.dragging && !g.longFired) tap(g.start);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    if (!el || onTarget || state.status !== 'playing') return;
    placeDog(Number(el.dataset.cell));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const cur = cursor ?? 0;
    const r = rowOf(cur, size);
    const c = colOf(cur, size);
    const move = (nr: number, nc: number) => {
      e.preventDefault();
      setCursor(Math.max(0, Math.min(size - 1, nr)) * size + Math.max(0, Math.min(size - 1, nc)));
    };
    switch (e.key) {
      case 'ArrowUp': return move(r - 1, c);
      case 'ArrowDown': return move(r + 1, c);
      case 'ArrowLeft': return move(r, c - 1);
      case 'ArrowRight': return move(r, c + 1);
      case ' ':
      case 'x':
        e.preventDefault();
        if (onTarget) return onTarget(cur);
        if (state.status === 'playing') dispatch({ type: 'toggleX', cell: cur });
        return;
      case 'Enter':
      case 'd':
        e.preventDefault();
        if (onTarget) return onTarget(cur);
        if (state.status === 'playing' && marks[cur] !== 'dog') placeDog(cur);
        return;
    }
  };

  useEffect(() => () => clearTimeout(gesture.current.longTimer), []);

  const doneUnits = useMemo(() => {
    const rows = new Set<number>();
    const cols = new Set<number>();
    const regs = new Set<number>();
    marks.forEach((m, i) => {
      if (m !== 'dog') return;
      rows.add(rowOf(i, size));
      cols.add(colOf(i, size));
      regs.add(regions[i]);
    });
    return { rows, cols, regs };
  }, [marks, size, regions]);

  const hintCells = useMemo(() => new Set(state.hint?.cells ?? []), [state.hint]);
  const focusCells = useMemo(() => {
    const set = new Set<number>();
    for (const u of state.hint?.units ?? []) {
      for (let i = 0; i < size * size; i++) {
        if ((u.type === 'row' && rowOf(i, size) === u.index) || (u.type === 'col' && colOf(i, size) === u.index) || (u.type === 'region' && regions[i] === u.index)) set.add(i);
      }
    }
    return set;
  }, [state.hint, size, regions]);

  const event = state.event;
  const conflictCells = useMemo(() => {
    if (event?.type !== 'wrong') return new Set<number>();
    return new Set(neighbors(event.cells[0], size));
  }, [event, size]);

  return (
    <div
      ref={boardRef}
      className={`board ${onTarget ? 'targeting' : ''}`}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, ['--n' as string]: size }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      onFocus={() => cursor === null && setCursor(0)}
      tabIndex={0}
      role="grid"
      aria-label={`${size} by ${size} puzzle board`}
    >
      {marks.map((mark, cell) => {
        const r = rowOf(cell, size);
        const c = colOf(cell, size);
        const reg = regions[cell];
        const b = (other: number | undefined) => (other === undefined || other !== reg ? 'var(--region-border)' : 'var(--cell-border)');
        const thick = (other: number | undefined) => (other === undefined || other !== reg ? 3 : 1);
        const up = r > 0 ? regions[cell - size] : undefined;
        const down = r < size - 1 ? regions[cell + size] : undefined;
        const left = c > 0 ? regions[cell - 1] : undefined;
        const right = c < size - 1 ? regions[cell + 1] : undefined;
        const done = settings.highlightDone && mark !== 'dog' && (doneUnits.rows.has(r) || doneUnits.cols.has(c) || doneUnits.regs.has(reg));
        const isEventCell = event?.cells.includes(cell);
        const classes = [
          'cell',
          done ? 'done' : '',
          hintCells.has(cell) ? 'hint' : '',
          focusCells.has(cell) ? 'focus' : '',
          cursor === cell ? 'cursor' : '',
          isEventCell && event?.type === 'wrong' ? 'wrong' : '',
          isEventCell && event?.type === 'shielded' ? 'shielded' : '',
          isEventCell && event?.type === 'powerUp' ? 'powered' : '',
          conflictCells.has(cell) && marks[cell] === 'dog' ? 'bark' : '',
        ].join(' ');
        return (
          <div
            key={`${cell}-${isEventCell ? event?.id : 0}`}
            data-cell={cell}
            className={classes}
            role="gridcell"
            aria-label={`Row ${r + 1}, column ${c + 1}, ${mark === 'dog' ? 'dog' : mark === 'empty' ? 'empty' : 'crossed'}`}
            style={{
              background: REGION_COLORS[reg],
              borderTop: `${thick(up)}px solid ${b(up)}`,
              borderBottom: `${thick(down)}px solid ${b(down)}`,
              borderLeft: `${thick(left)}px solid ${b(left)}`,
              borderRight: `${thick(right)}px solid ${b(right)}`,
            }}
          >
            {mark === 'dog' && <DogFace breed={reg} className="dog pop" />}
            {mark === 'x' && <span className="mark x">✕</span>}
            {mark === 'autoX' && <span className="mark auto">•</span>}
            {isEventCell && event?.type === 'wrong' && <DogFace breed={reg} mood="sad" className="dog ghost" />}
          </div>
        );
      })}
    </div>
  );
});
