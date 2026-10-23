import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import { REGION_COLORS } from '../../ui/colors';
import type { MiniGameProps } from '../registry';
import {
  canPlace,
  countCollected,
  countTreats,
  createKibbleState,
  generateKibblePuzzle,
  kibbleBlocksConfigForTier,
  kibbleBlocksStars,
  placeKibblePiece,
  rotatePiece,
  type KibblePiece,
} from './logic';
import './kibbleBlocks.css';

export default function KibbleBlocksView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateKibblePuzzle(kibbleBlocksConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState(() => createKibbleState(puzzle));
  const [selected, setSelected] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const totalTreats = countTreats(puzzle);
  const collected = countCollected(state);
  const finish = (finalState: typeof state) => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ stars: kibbleBlocksStars(finalState), summary: `${countCollected(finalState)}/${totalTreats} treats · ${finalState.score} pts` });
  };

  useEffect(() => {
    if (!state.over || finished.current) return;
    finished.current = true;
    const timer = window.setTimeout(() => {
      onFinish({ stars: kibbleBlocksStars(state), summary: `${collected}/${totalTreats} treats · ${state.score} pts` });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [collected, onFinish, state, totalTreats]);

  /** Board geometry measured from the DOM so padding and gaps are accounted for. */
  const boardMetrics = () => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const pad = parseFloat(cs.paddingLeft) || 0;
    const gap = parseFloat(cs.columnGap) || 0;
    const pitch = (rect.width - 2 * pad + gap) / 8;
    return { rect, pad, gap, pitch, cell: pitch - gap };
  };

  const cellFromPoint = (x: number, y: number) => {
    const m = boardMetrics();
    if (!m) return null;
    const col = Math.floor((x - m.rect.left - m.pad + m.gap / 2) / m.pitch);
    const row = Math.floor((y - m.rect.top - m.pad + m.gap / 2) / m.pitch);
    return row >= 0 && col >= 0 && row < 8 && col < 8 ? { row, col } : null;
  };

  const tryPlace = (handIndex: number, row: number, col: number) => {
    setState((s) => placeKibblePiece(s, handIndex, row, col));
    setSelected(null);
    setGhost(null);
  };

  // ----- Drag & drop (works for mouse, pen and touch) -----
  const [drag, setDrag] = useState<{ index: number; x: number; y: number; lift: number; moved: boolean } | null>(null);
  const dragRef = useRef<{ index: number; startX: number; startY: number; lift: number; moved: boolean } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Top-left anchor cell for a piece floating centred at (x, y - lift). */
  const anchorFor = (piece: KibblePiece, x: number, y: number, lift: number) => {
    const m = boardMetrics();
    if (!m) return null;
    const w = Math.max(...piece.cells.map(([, c]) => c)) + 1;
    const h = Math.max(...piece.cells.map(([r]) => r)) + 1;
    const left = x - (w * m.pitch - m.gap) / 2 + m.cell / 2;
    const top = y - lift - (h * m.pitch - m.gap) / 2 + m.cell / 2;
    const col = Math.round((left - m.rect.left - m.pad - m.cell / 2) / m.pitch);
    const row = Math.round((top - m.rect.top - m.pad - m.cell / 2) / m.pitch);
    if (row < -h + 1 || col < -w + 1 || row > 7 || col > 7) return null;
    return { row, col };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: globalThis.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) d.moved = true;
      if (!d.moved) return;
      e.preventDefault();
      const piece = stateRef.current.hand[d.index];
      setDrag({ index: d.index, x: e.clientX, y: e.clientY, lift: d.lift, moved: true });
      setGhost(piece ? anchorFor(piece, e.clientX, e.clientY, d.lift) : null);
    };
    const onUp = (e: globalThis.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        // A tap: toggle selection, then tap a cell to place.
        setSelected((old) => (old === d.index ? null : d.index));
        setGhost(null);
        return;
      }
      const piece = stateRef.current.hand[d.index];
      const at = piece ? anchorFor(piece, e.clientX, e.clientY, d.lift) : null;
      if (piece && at && canPlace(stateRef.current.occupied, piece, at.row, at.col)) tryPlace(d.index, at.row, at.col);
      else {
        setSelected(d.index);
        setGhost(null);
      }
    };
    const onCancel = () => {
      dragRef.current = null;
      setDrag(null);
      setGhost(null);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const startDrag = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (!state.hand[index] || state.over || e.button > 0) return;
    e.preventDefault();
    // Touch pointers are implicitly captured by the pressed element; release so moves reach the window cleanly.
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const m = boardMetrics();
    const lift = e.pointerType === 'mouse' ? 0 : Math.max(48, (m?.pitch ?? 40) * 1.6);
    dragRef.current = { index, startX: e.clientX, startY: e.clientY, lift, moved: false };
    setDrag({ index, x: e.clientX, y: e.clientY, lift, moved: false });
  };

  const rotateSelected = () => {
    if (selected === null) return;
    setState((s) => {
      const piece = s.hand[selected];
      if (!piece) return s;
      const hand = [...s.hand];
      hand[selected] = rotatePiece(piece);
      return { ...s, hand };
    });
  };

  const dragging = drag?.moved ? drag : null;
  const activeIndex = dragging ? dragging.index : selected;
  const activePiece = activeIndex === null ? null : state.hand[activeIndex];
  const validGhost = activePiece && ghost ? canPlace(state.occupied, activePiece, ghost.row, ghost.col) : false;
  const metrics = dragging ? boardMetrics() : null;

  return (
    <div className="minigame kibbleBlocks-game">
      <div className="mg-stats">
        <span>
          🦴 {collected}/{totalTreats} treats
        </span>
        <span>
          🔁 Round {state.roundIndex + 1}/{puzzle.dealShapeIds.length}
        </span>
        <span>⭐ {state.score}</span>
      </div>
      <div
        ref={boardRef}
        className="kibble-board"
        onPointerMove={(e) => {
          if (!dragRef.current && e.pointerType === 'mouse' && selected !== null) setGhost(cellFromPoint(e.clientX, e.clientY));
        }}
        onPointerLeave={() => {
          if (!dragRef.current) setGhost(null);
        }}
      >
        {Array.from({ length: 64 }, (_, cell) => {
          const row = Math.floor(cell / 8);
          const col = cell % 8;
          const ghosted = activePiece && ghost && activePiece.cells.some(([r, c]) => ghost.row + r === row && ghost.col + c === col);
          return (
            <button
              key={cell}
              className={`kibble-cell ${state.occupied[cell] ? 'filled' : ''} ${puzzle.treats[cell] && !state.collected[cell] ? 'treat' : ''} ${state.collected[cell] ? 'collected' : ''} ${ghosted ? (validGhost ? 'ghost valid' : 'ghost invalid') : ''}`}
              onClick={() => selected !== null && tryPlace(selected, row, col)}
              aria-label={`cell ${row + 1}, ${col + 1}`}
            >
              {puzzle.treats[cell] && !state.collected[cell] && <span>✦</span>}
              {state.collected[cell] && <span>✓</span>}
            </button>
          );
        })}
      </div>
      <div className="kibble-hand" aria-label="Kibble pieces">
        {state.hand.map((piece, i) => (
          <button
            key={i}
            className={`kibble-piece ${selected === i ? 'selected' : ''} ${dragging?.index === i ? 'lifted' : ''}`}
            disabled={!piece || state.over}
            onPointerDown={(e) => startDrag(e, i)}
            onClick={(e) => {
              // Pointer taps are handled in the drag handler; this covers keyboard activation.
              if (e.detail === 0 && piece) setSelected((old) => (old === i ? null : i));
            }}
            aria-pressed={selected === i}
          >
            {piece ? <PiecePreview piece={piece} /> : <span className="kibble-used">Placed</span>}
          </button>
        ))}
      </div>
      {dragging && activePiece && metrics && (
        <div
          className="kibble-drag"
          style={{
            left: dragging.x,
            top: dragging.y - dragging.lift,
            ['--cell' as string]: `${metrics.cell}px`,
            ['--gap' as string]: `${metrics.gap}px`,
          }}
        >
          <PiecePreview piece={activePiece} />
        </div>
      )}
      <div className="mg-actions">
        <button className="btn" onClick={() => setState(createKibbleState(puzzle))}>
          ⟲ Reset
        </button>
        <button className="btn ghost" disabled={selected === null} onClick={rotateSelected}>
          ⤾ Rotate
        </button>
        <button className="btn primary" disabled={!state.over} onClick={() => finish(state)}>
          Done
        </button>
      </div>
      <DogFace breed={tier} mood={state.won ? 'happy' : 'calm'} className="kibble-mascot" />
    </div>
  );
}

function PiecePreview({ piece }: { piece: KibblePiece }) {
  const width = Math.max(...piece.cells.map(([, c]) => c)) + 1;
  const height = Math.max(...piece.cells.map(([r]) => r)) + 1;
  return (
    <span className="kibble-piece-grid" style={{ gridTemplateColumns: `repeat(${width}, var(--cell))`, gridTemplateRows: `repeat(${height}, var(--cell))` }}>
      {Array.from({ length: width * height }, (_, i) => {
        const r = Math.floor(i / width);
        const c = i % width;
        const filled = piece.cells.some(([rr, cc]) => rr === r && cc === c);
        return (
          <span
            key={i}
            className={filled ? 'block' : ''}
            style={{ background: filled ? REGION_COLORS[piece.shapeId.length % REGION_COLORS.length] : undefined }}
          />
        );
      })}
    </span>
  );
}
