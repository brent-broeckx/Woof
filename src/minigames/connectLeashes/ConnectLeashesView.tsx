import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import { LEASH_COLORS } from '../../ui/colors';
import type { MiniGameProps } from '../registry';
import {
  allConnected,
  createLeashState,
  endpointColor,
  generateLeashPuzzle,
  isComplete,
  isFilled,
  leashConfigForTier,
  leashStars,
  pointerDown,
  pointerEnter,
  pointerUp,
} from './logic';

export default function ConnectLeashesView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => {
    const { size, pairs } = leashConfigForTier(tier);
    return generateLeashPuzzle(size, pairs, seed);
  }, [tier, seed]);
  const [state, setState] = useState(() => createLeashState(puzzle));
  const boardRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const { size, endpoints } = puzzle;
  const target = endpoints.length + 3;

  const cellAt = (e: PointerEvent) => {
    const rect = boardRef.current!.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    if (r < 0 || c < 0 || r >= size || c >= size) return -1;
    return r * size + c;
  };

  const finish = (s: typeof state) => {
    if (finished.current) return;
    finished.current = true;
    const stars = leashStars(s);
    onFinish({ stars, summary: `${s.moves} strokes (target ${target})` });
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const cell = cellAt(e);
    if (cell < 0) return;
    try {
      boardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers can't be captured */
    }
    setState((s) => pointerDown(s, cell));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (state.active === null) return;
    const cell = cellAt(e);
    if (cell < 0) return;
    setState((s) => pointerEnter(s, cell));
  };
  const onUp = () => {
    const next = pointerUp(state);
    setState(next);
    if (allConnected(next) && isFilled(next)) window.setTimeout(() => finish(next), 500);
  };

  const connected = endpoints.filter((_, k) => isComplete(state, k)).length;
  const covered = new Set([...state.paths.flat(), ...endpoints.flat()]).size;

  return (
    <div className="minigame leash-game">
      <div className="mg-stats">
        <span>
          🔗 {connected}/{endpoints.length} pairs
        </span>
        <span>🟩 {Math.round((covered / (size * size)) * 100)}% filled</span>
        <span>
          ✍️ {state.moves} / {target} strokes
        </span>
      </div>
      <div
        ref={boardRef}
        className="leash-board"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {Array.from({ length: size * size }, (_, cell) => {
          const ep = endpointColor(puzzle, cell);
          const pathColor = state.paths.findIndex((p) => p.includes(cell));
          return (
            <div key={cell} className="leash-cell" style={{ background: pathColor >= 0 ? `${LEASH_COLORS[pathColor]}33` : undefined }}>
              {ep >= 0 && (
                <div className={`leash-dog ${isComplete(state, ep) ? 'happy' : ''}`} style={{ background: LEASH_COLORS[ep] }}>
                  <DogFace breed={ep} />
                </div>
              )}
            </div>
          );
        })}
        <svg className="leash-lines" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="none">
          {state.paths.map((path, k) =>
            path.length > 1 ? (
              <polyline
                key={k}
                points={path.map((c) => `${(c % size) + 0.5},${Math.floor(c / size) + 0.5}`).join(' ')}
                stroke={LEASH_COLORS[k]}
                strokeWidth={0.28}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null,
          )}
        </svg>
      </div>
      <div className="mg-actions">
        <button className="btn" onClick={() => setState(createLeashState(puzzle))}>
          ⟲ Clear
        </button>
        <button className="btn primary" disabled={!allConnected(state)} onClick={() => finish(state)}>
          Done
        </button>
      </div>
    </div>
  );
}
