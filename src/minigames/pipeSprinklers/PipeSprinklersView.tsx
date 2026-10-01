import { useEffect, useMemo, useRef, useState } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import type { MiniGameProps } from '../registry';
import {
  PIPE_E,
  PIPE_N,
  PIPE_S,
  PIPE_W,
  createPipeState,
  generatePipeSprinklersPuzzle,
  isPipeSolved,
  pipeFlow,
  pipeSprinklersConfigForTier,
  pipeSprinklersStars,
  resetPipe,
  rotatePipeTile,
  undoPipe,
  type PipeMask,
  type PipeState,
} from './logic';
import './pipeSprinklers.css';

const bits = [PIPE_N, PIPE_E, PIPE_S, PIPE_W] as const;

function PipeSvg({ mask, wet, source }: { mask: PipeMask; wet: boolean; source: boolean }) {
  const color = wet ? '#43aee8' : '#c9bda9';
  const arms = bits.map((bit) => {
    if ((mask & bit) === 0) return null;
    const line = {
      [PIPE_N]: { x1: 50, y1: 50, x2: 50, y2: 4 },
      [PIPE_E]: { x1: 50, y1: 50, x2: 96, y2: 50 },
      [PIPE_S]: { x1: 50, y1: 50, x2: 50, y2: 96 },
      [PIPE_W]: { x1: 50, y1: 50, x2: 4, y2: 50 },
    }[bit];
    return <line key={bit} {...line} />;
  });
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g stroke="#fffaf2" strokeWidth="24" strokeLinecap="round">
        {arms}
        <circle cx="50" cy="50" r="9" fill="none" />
      </g>
      <g stroke={color} strokeWidth="16" strokeLinecap="round">
        {arms}
        <circle cx="50" cy="50" r="8" fill={color} stroke="none" />
      </g>
      {source && (
        <g>
          <circle cx="50" cy="50" r="18" fill="#e8805a" />
          <text x="50" y="57" textAnchor="middle" fontSize="22">
            🚰
          </text>
        </g>
      )}
    </svg>
  );
}

export default function PipeSprinklersView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generatePipeSprinklersPuzzle(pipeSprinklersConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState<PipeState>(() => createPipeState(puzzle));
  const finished = useRef(false);
  const flow = pipeFlow(puzzle.size, puzzle.source, state.masks);
  const bowlSet = new Set(puzzle.bowls);
  const wateredBowls = puzzle.bowls.filter((b) => flow.watered.has(b)).length;

  useEffect(() => {
    if (!isPipeSolved(state.puzzle, state.masks) || finished.current) return;
    finished.current = true;
    const stars = pipeSprinklersStars(state.moves, state.puzzle.target);
    window.setTimeout(() => onFinish({ stars, summary: `${state.moves} rotations (target ${state.puzzle.target})` }), 750);
  }, [state, onFinish]);

  const rotate = (index: number, direction: 1 | -1) => {
    if (finished.current) return;
    setState((s) => rotatePipeTile(s, index, direction));
  };

  return (
    <div className="minigame pipeSprinklers-game">
      <div className="mg-stats">
        <span>🔄 {state.moves} rotations</span>
        <span>🎯 target {puzzle.target}</span>
        <span>
          🐶 {wateredBowls}/{puzzle.bowls.length} dogs watered
        </span>
      </div>
      <div className="pipe-board" style={{ ['--n' as string]: puzzle.size }} aria-label="Pipe Sprinklers board">
        {state.masks.map((mask, i) => {
          const wet = flow.watered.has(i);
          const bowl = bowlSet.has(i);
          return (
            <button
              key={i}
              className={`pipe-tile ${wet ? 'wet' : ''}`}
              onClick={() => rotate(i, 1)}
              onContextMenu={(event) => {
                event.preventDefault();
                rotate(i, -1);
              }}
              aria-label={`Pipe tile ${i + 1}`}
            >
              <PipeSvg mask={mask} wet={wet} source={i === puzzle.source} />
              {bowl && (
                <span className="pipe-bowl">
                  <DogFace breed={(seed + i) % 11} mood={wet ? 'happy' : 'sad'} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mg-actions">
        <button className="btn" onClick={() => setState((s) => undoPipe(s))} disabled={!state.history.length}>
          Undo
        </button>
        <button className="btn ghost" onClick={() => setState((s) => resetPipe(s))}>
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
