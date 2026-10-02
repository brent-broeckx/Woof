import { useCallback, useEffect, useState } from 'react';
import { CAFE_LEVELS, CAFE_PERFECT_KIBBLE, cafeCleared, cafeConfig, cafeNext, cafeTreats } from '../../core/progression/catCafe';
import type { Puzzle } from '../../core/puzzle/types';
import { useNav } from '../../store/navStore';
import { highestUnlocked, useSave, type PuzzleOutcome } from '../../store/saveStore';
import { DogFace } from '../components/DogFace';
import { PuzzleSession } from '../components/PuzzleSession';
import { TopBar } from '../components/common';
import { generateInWorker } from '../generate';

/** The café opens partway through World 1, once the basics are familiar. */
export const CAFE_UNLOCK_LEVEL = 11;

const CAFE_TUTORIAL = {
  id: 'cafe-cats',
  title: '🐈 Sleeping cats',
  lines: [
    'Some cells hold a sleeping cat. No dog can go on a cat — treat it like a cell that is already crossed out.',
    'All the usual rules still apply: one dog per row, column and yard, and dogs never touch.',
    'The cats can be a big clue: a yard or row with lots of cats has fewer spots left!',
  ],
};

export function CafeScreen() {
  const go = useNav((s) => s.go);
  const cafe = useSave((s) => s.cafe);
  const unlocked = useSave((s) => highestUnlocked(s.progress) >= CAFE_UNLOCK_LEVEL);
  const [level, setLevel] = useState<number | null>(null);
  const [puzzle, setPuzzle] = useState<{ level: number; puzzle: Puzzle } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = cafeNext(cafe);

  useEffect(() => {
    if (level === null) return;
    let alive = true;
    const { size, seed, maxDifficulty, cats } = cafeConfig(level);
    generateInWorker({ size, seed, maxDifficulty, cats })
      .then((p) => alive && setPuzzle({ level, puzzle: p }))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [level]);

  const onWin = useCallback((lvl: number, o: PuzzleOutcome) => {
    const r = useSave.getState().completeCafe(lvl, o);
    const lines: string[] = [];
    if (r.treats) lines.push(`🐈 Café level cleared! +${r.treats} 🍖 treats`);
    if (r.firstPerfect) lines.push(`😸 Purrfect — 3 stars! (+${CAFE_PERFECT_KIBBLE} 🥣)`);
    if (!r.firstClear && !r.kibble) lines.push('Already cleared — the cats are still napping happily.');
    return { kibble: r.kibble, lines };
  }, []);

  if (level !== null && puzzle?.level === level) {
    const cfg = cafeConfig(level);
    const nextLevel = level < CAFE_LEVELS ? level + 1 : null;
    return (
      <PuzzleSession
        key={level}
        sessionId={-200000 - level}
        puzzle={puzzle.puzzle}
        title={`Cat Café ${level}`}
        subtitle={`🐈 ${cfg.size}×${cfg.size} · ${cfg.cats} sleeping cats`}
        background="linear-gradient(180deg, #fbeee0 0%, #f6dfe8 100%)"
        tutorial={level === 1 ? CAFE_TUTORIAL : null}
        resultTitle="Cats undisturbed!"
        onBack={() => setLevel(null)}
        onWin={(o) => onWin(level, o)}
        next={nextLevel ? { label: `Café ${nextLevel} ▶`, action: () => setLevel(nextLevel) } : null}
      />
    );
  }

  return (
    <div className="screen cafe-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🐈 Cat Café" />
      <div className="card center">
        <div className="modal-dog cafe-hero">
          <DogFace breed="poodle" mood="calm" />
          <span className="cafe-cat" aria-hidden="true">
            🐈
          </span>
        </div>
        <h2>Shhh… cats are napping</h2>
        <p className="muted">Some cells hold a sleeping cat — no dog may go there. Seat every pup without waking anyone!</p>
        {!unlocked ? (
          <p className="muted">🔒 Reach level {CAFE_UNLOCK_LEVEL} to open the café.</p>
        ) : (
          <>
            <p className="muted small">
              Cleared {cafeCleared(cafe)} / {CAFE_LEVELS} · first clears give treats (from {cafeTreats(1)} 🍖), 3 stars give +{CAFE_PERFECT_KIBBLE} 🥣
            </p>
            {error && <p className="error">Could not set the tables: {error}</p>}
            {level !== null && !error && <p className="muted">Setting the tables…</p>}
          </>
        )}
      </div>
      {unlocked && (
        <div className="cafe-grid">
          {Array.from({ length: CAFE_LEVELS }, (_, i) => i + 1).map((l) => {
            const stars = cafe.stars[l] ?? 0;
            const locked = l > open;
            return (
              <button
                key={l}
                className={`cafe-tile ${stars ? 'done' : ''} ${l === open && !stars ? 'current' : ''}`}
                disabled={locked || level !== null}
                aria-label={`Café level ${l}${locked ? ', locked' : stars ? `, ${stars} stars` : ''}`}
                onClick={() => {
                  setError(null);
                  setLevel(l);
                }}
              >
                <b>{locked ? '🔒' : l}</b>
                <small>{stars ? '★'.repeat(stars) : locked ? '' : `🐈×${cafeConfig(l).cats}`}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
