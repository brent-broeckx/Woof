import { useEffect, useMemo, useRef, useState } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import type { MiniGameProps } from '../registry';
import { createLightsOutState, generateLightsOutPuzzle, lightsOutConfigForTier, lightsOutStars, pressLamp, resetLamps, undoLamp } from './logic';
import './lightsOut.css';

export default function LightsOutView({ tier, seed, onFinish }: MiniGameProps) {
  const puzzle = useMemo(() => generateLightsOutPuzzle(lightsOutConfigForTier(tier), seed), [tier, seed]);
  const [state, setState] = useState(() => createLightsOutState(puzzle));
  const finished = useRef(false);

  useEffect(() => {
    if (!state.won || finished.current) return;
    finished.current = true;
    const timer = window.setTimeout(() => onFinish({ stars: lightsOutStars(state), summary: `${state.moves} presses (optimal ${puzzle.optimal})` }), 700);
    return () => window.clearTimeout(timer);
  }, [onFinish, puzzle.optimal, state]);

  return (
    <div className="minigame lightsOut-game">
      <div className="mg-stats">
        <span>💡 {state.lamps.filter(Boolean).length} on</span>
        <span>👆 {state.moves} presses</span>
        <span>🎯 target {puzzle.optimal}</span>
      </div>
      <div className="lamps-board" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
        {state.lamps.map((on, i) => (
          <button
            key={i}
            className={`lamp-cell ${on ? 'on' : 'off'}`}
            onClick={() => setState((s) => pressLamp(s, i))}
            aria-label={`kennel ${i + 1} ${on ? 'lit' : 'dark'}`}
          >
            <span className="lamp-roof">⌂</span>
            <DogFace breed={i} mood={on ? 'happy' : 'calm'} />
          </button>
        ))}
      </div>
      <div className="mg-actions">
        <button className="btn" disabled={!state.history.length || state.won} onClick={() => setState((s) => undoLamp(s))}>
          Undo
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            finished.current = false;
            setState((s) => resetLamps(s));
          }}
        >
          ⟲ Reset
        </button>
      </div>
    </div>
  );
}
