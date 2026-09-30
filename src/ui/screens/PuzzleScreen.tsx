import { useCallback } from 'react';
import { getLevel, TOTAL_LEVELS, WORLDS } from '../../core/progression/levels';
import { PUZZLES } from '../../data/puzzles';
import { useNav } from '../../store/navStore';
import { useSave, type PuzzleOutcome } from '../../store/saveStore';
import { PuzzleSession } from '../components/PuzzleSession';

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

export function PuzzleScreen({ levelId, puzzleIndex }: { levelId: number; puzzleIndex: number }) {
  const go = useNav((s) => s.go);
  const puzzle = PUZZLES[puzzleIndex];
  const world = WORLDS[getLevel(levelId).world - 1];
  const nextLevel = levelId < TOTAL_LEVELS ? levelId + 1 : null;
  const tip = TUTORIAL[levelId];

  const onWin = useCallback((o: PuzzleOutcome) => ({ treats: useSave.getState().completePuzzle(levelId, o).treats }), [levelId]);
  const onStart = useCallback(() => useSave.getState().recordAttempt(levelId), [levelId]);
  const onLose = useCallback(() => useSave.getState().recordLoss(levelId), [levelId]);

  return (
    <PuzzleSession
      sessionId={levelId}
      puzzle={puzzle}
      persist
      title={`Level ${levelId}`}
      subtitle={`${world.emoji} ${world.name} · ${puzzle.size}×${puzzle.size}`}
      background={world.background}
      tutorial={tip ? { id: `level-${levelId}`, ...tip } : null}
      resultTitle={`Level ${levelId} complete!`}
      onBack={() => go({ name: 'map' })}
      onStart={onStart}
      onLose={onLose}
      onWin={onWin}
      next={nextLevel ? { label: 'Next →', action: () => go({ name: 'level', id: nextLevel }) } : null}
    />
  );
}
