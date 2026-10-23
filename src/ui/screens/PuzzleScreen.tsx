import { useCallback, useEffect, useState } from 'react';
import { extraPuzzleSpec, getLevel, isExtraLevel, WORLDS } from '../../core/progression/levels';
import type { Puzzle } from '../../core/puzzle/types';
import { PUZZLES } from '../../data/puzzles';
import { useNav } from '../../store/navStore';
import { useSave, type PuzzleOutcome } from '../../store/saveStore';
import { PuzzleSession } from '../components/PuzzleSession';
import { TopBar } from '../components/common';
import { generateInWorker } from '../generate';

const TUTORIAL: Record<number, { title: string; lines: string[] }> = {
  1: {
    title: 'Welcome to Woofdoku!',
    lines: [
      'Put one 🐶 in every row, every column and every coloured yard.',
      'Double-tap (or long-press / right-click) a tile to place a dog. Tap once to cross a tile off with ✕.',
      'Tip: a yard with only one tile must hold its dog!',
    ],
  },
  2: {
    title: 'New trick!',
    lines: [
      'Dogs need personal space: two dogs may never touch — not even diagonally.',
      'After placing a dog, the tiles it blocks are marked with • automatically.',
    ],
  },
  3: { title: 'New trick!', lines: ['Drag across tiles to cross off many at once.', 'Stuck? Tap 💡 for a free nudge each level.'] },
};

/** World levels use the pre-built puzzles; extra levels are generated (always the same per level). */
function useLevelPuzzle(levelId: number, puzzleIndex: number): { puzzle: Puzzle | null; failed: boolean } {
  const fixed: Puzzle | undefined = isExtraLevel(levelId) ? undefined : PUZZLES[puzzleIndex];
  const [generated, setGenerated] = useState<{ id: number; puzzle: Puzzle | null } | null>(null);
  useEffect(() => {
    if (fixed) return;
    let alive = true;
    generateInWorker(extraPuzzleSpec(levelId))
      .then((puzzle) => alive && setGenerated({ id: levelId, puzzle }))
      .catch(() => alive && setGenerated({ id: levelId, puzzle: null }));
    return () => {
      alive = false;
    };
  }, [levelId, fixed]);
  if (fixed) return { puzzle: fixed, failed: false };
  const mine = generated?.id === levelId ? generated : null;
  return { puzzle: mine?.puzzle ?? null, failed: !!mine && !mine.puzzle };
}

export function PuzzleScreen({ levelId, puzzleIndex }: { levelId: number; puzzleIndex: number }) {
  const go = useNav((s) => s.go);
  const { puzzle, failed } = useLevelPuzzle(levelId, puzzleIndex);
  const extra = isExtraLevel(levelId);
  const world = WORLDS[getLevel(levelId).world - 1];
  const nextLevel = levelId + 1;
  const tip = TUTORIAL[levelId];

  const onWin = useCallback(
    (o: PuzzleOutcome) => {
      const r = useSave.getState().completePuzzle(levelId, o);
      return { kibble: r.kibble };
    },
    [levelId],
  );
  const onStart = useCallback(() => useSave.getState().recordAttempt(levelId), [levelId]);
  const onLose = useCallback(() => useSave.getState().recordLoss(levelId), [levelId]);

  if (!puzzle) {
    return (
      <div className="screen" style={{ background: world.background }}>
        <TopBar onBack={() => go({ name: 'map' })} title={`Level ${levelId}`} />
        <div className="loading">{failed ? 'Could not dig up this puzzle. Please try again.' : 'Digging up a fresh puzzle…'}</div>
      </div>
    );
  }

  return (
    <PuzzleSession
      sessionId={levelId}
      puzzle={puzzle}
      persist
      title={`Level ${levelId}`}
      subtitle={`${extra ? '♾️ Extra level' : `${world.emoji} ${world.name}`} · ${puzzle.size}×${puzzle.size}`}
      background={world.background}
      tutorial={tip ? { id: `level-${levelId}`, ...tip } : null}
      resultTitle={`Level ${levelId} complete!`}
      onBack={() => go({ name: 'map' })}
      onStart={onStart}
      onLose={onLose}
      onWin={onWin}
      next={{ label: 'Next →', action: () => go({ name: 'level', id: nextLevel }) }}
    />
  );
}
