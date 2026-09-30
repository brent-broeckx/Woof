import { useCallback, useEffect, useState } from 'react';
import { ENDLESS_DIFFICULTY, type EndlessDifficulty } from '../../core/progression/daily';
import type { Puzzle } from '../../core/puzzle/types';
import { useNav } from '../../store/navStore';
import { useSave, type PuzzleOutcome } from '../../store/saveStore';
import { PuzzleSession } from '../components/PuzzleSession';
import { TopBar } from '../components/common';
import { generateInWorker } from '../generate';

const SIZES = [5, 6, 7, 8, 9, 10];

export function EndlessScreen() {
  const go = useNav((s) => s.go);
  const solved = useSave((s) => s.stats.totals.endlessSolved);
  const [size, setSize] = useState(7);
  const [difficulty, setDifficulty] = useState<EndlessDifficulty>('medium');
  const [round, setRound] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (round === 0) return;
    let alive = true;
    setLoading(true);
    setPuzzle(null);
    generateInWorker({ size, seed: Math.floor(Math.random() * 2 ** 31), maxDifficulty: ENDLESS_DIFFICULTY[difficulty].maxDifficulty })
      .then((p) => alive && setPuzzle(p))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [round, size, difficulty]);

  const onWin = useCallback((o: PuzzleOutcome) => useSave.getState().completeEndless(size, o), [size]);

  if (round > 0 && puzzle) {
    return (
      <PuzzleSession
        key={round}
        sessionId={-round}
        puzzle={puzzle}
        title="Endless Park"
        subtitle={`♾️ #${solved + 1} · ${ENDLESS_DIFFICULTY[difficulty].label} · ${size}×${size}`}
        background="linear-gradient(180deg, #e3f6ff 0%, #e9ffe8 100%)"
        resultTitle="Good dog!"
        onBack={() => setRound(0)}
        onWin={onWin}
        next={{ label: 'Next puzzle →', action: () => setRound((r) => r + 1) }}
      />
    );
  }

  return (
    <div className="screen endless-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="♾️ Endless Park" />
      <div className="card">
        <p className="muted center">Freshly generated puzzles, as many as you like. Every solve earns a few treats.</p>
        <h3>Board size</h3>
        <div className="chip-row">
          {SIZES.map((s) => (
            <button key={s} className={`chip ${s === size ? 'on' : ''}`} onClick={() => setSize(s)}>
              {s}×{s}
            </button>
          ))}
        </div>
        <h3>Difficulty</h3>
        <div className="chip-row">
          {(Object.keys(ENDLESS_DIFFICULTY) as EndlessDifficulty[]).map((d) => (
            <button key={d} className={`chip ${d === difficulty ? 'on' : ''}`} onClick={() => setDifficulty(d)}>
              {ENDLESS_DIFFICULTY[d].label}
            </button>
          ))}
        </div>
        <p className="muted center">Solved so far: {solved}</p>
        <button className="btn primary big" disabled={loading} onClick={() => setRound((r) => r + 1)}>
          {loading ? 'Digging up a puzzle…' : 'Play'}
        </button>
      </div>
    </div>
  );
}
