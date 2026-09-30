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

  const cellAt = (e: PointerEvent) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    return row >= 0 && col >= 0 && row < 8 && col < 8 ? { row, col } : null;
  };

  const tryPlace = (handIndex: number, row: number, col: number) => {
    setState((s) => placeKibblePiece(s, handIndex, row, col));
    setSelected(null);
    setGhost(null);
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

  const activePiece = selected === null ? null : state.hand[selected];
  const validGhost = activePiece && ghost ? canPlace(state.occupied, activePiece, ghost.row, ghost.col) : false;

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
        onPointerMove={(e) => setGhost(cellAt(e))}
        onPointerLeave={() => setGhost(null)}
        onPointerUp={(e) => {
          const cell = cellAt(e);
          if (selected !== null && cell) tryPlace(selected, cell.row, cell.col);
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
            className={`kibble-piece ${selected === i ? 'selected' : ''}`}
            disabled={!piece || state.over}
            onClick={() => setSelected((old) => (old === i ? null : i))}
            onPointerDown={(e) => {
              if (!piece) return;
              setSelected(i);
              e.preventDefault();
            }}
          >
            {piece ? <PiecePreview piece={piece} /> : <span className="kibble-used">Placed</span>}
          </button>
        ))}
      </div>
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
    <span className="kibble-piece-grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, gridTemplateRows: `repeat(${height}, 1fr)` }}>
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
