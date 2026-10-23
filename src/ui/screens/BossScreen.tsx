import { useCallback, useEffect, useState } from 'react';
import { LEVELS_PER_WORLD } from '../../core/progression/levels';
import { BOSS_FLAWLESS_KIBBLE, BOSS_REWARD, bossConfig, bossesCleared, isoWeekKey, msUntilNextWeek } from '../../core/progression/boss';
import type { Puzzle } from '../../core/puzzle/types';
import { useNav } from '../../store/navStore';
import { highestUnlocked, useSave, type PuzzleOutcome } from '../../store/saveStore';
import { DogFace } from '../components/DogFace';
import { PuzzleSession } from '../components/PuzzleSession';
import { Stars, TopBar, formatTime } from '../components/common';
import { generateInWorker } from '../generate';

/** The boss unlocks once the first world is finished. */
export const BOSS_UNLOCK_LEVEL = LEVELS_PER_WORLD + 1;

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

export function BossScreen() {
  const go = useNav((s) => s.go);
  const boss = useSave((s) => s.boss);
  const progress = useSave((s) => s.progress);
  const [week] = useState(() => isoWeekKey());
  const [resetIn] = useState(() => msUntilNextWeek());
  const cfg = bossConfig(week);
  const unlocked = highestUnlocked(progress) >= BOSS_UNLOCK_LEVEL;
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    generateInWorker({ size: cfg.size, seed: cfg.seed, maxDifficulty: cfg.maxDifficulty, minDifficulty: cfg.minDifficulty })
      .then((p) => alive && setPuzzle(p))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [unlocked, cfg.size, cfg.seed, cfg.maxDifficulty, cfg.minDifficulty]);

  const onWin = useCallback(
    (o: PuzzleOutcome) => {
      const r = useSave.getState().completeBoss(week, o);
      const lines: string[] = [];
      if (r.treats) lines.push(`🏔️ Boss beaten! +${r.treats} 🍖 treats`);
      if (r.firstFlawless) lines.push('🛡️ Flawless — no mistakes, no power-ups!');
      if (!r.firstClear && r.newBest) lines.push('⏱ New best for this week!');
      if (!r.firstClear && !r.kibble) lines.push('Already beaten this week — a new boss arrives on Monday.');
      return { kibble: r.kibble, lines };
    },
    [week],
  );

  if (playing && puzzle) {
    return (
      <PuzzleSession
        sessionId={-100000}
        puzzle={puzzle}
        title="Weekly Boss"
        subtitle={`🏔️ ${week} · ${cfg.size}×${cfg.size} · Very hard`}
        background="linear-gradient(180deg, #e2e6f3 0%, #f3e3ff 100%)"
        resultTitle="Boss beaten!"
        onBack={() => go({ name: 'title' })}
        onWin={onWin}
      />
    );
  }

  const record = boss.records[week];
  return (
    <div className="screen boss-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🏔️ Weekly Boss" />
      <div className="card center">
        <div className="modal-dog">
          <DogFace breed="stbernard" mood={record ? 'happy' : 'calm'} />
        </div>
        <h2>Summit of the week</h2>
        <p className="muted">
          One huge {cfg.size}×{cfg.size} puzzle per week, the same for everyone. It needs the toughest tricks in the book.
        </p>
        <p className="boss-week">
          📆 <b>{week}</b> · new boss in {formatCountdown(resetIn)}
        </p>
        {!unlocked ? (
          <p className="muted">🔒 Finish World 1 to take on the boss.</p>
        ) : (
          <>
            {record ? (
              <>
                <Stars count={record.stars} />
                <p className="muted">
                  Best this week: ⏱ {formatTime(record.timeMs)}
                  {record.stars < 3 ? ` · Beat it flawlessly for +${BOSS_FLAWLESS_KIBBLE} 🥣` : ' · Flawless!'}
                </p>
              </>
            ) : (
              <p className="muted">
                First clear: +{BOSS_REWARD.kibble} 🥣 and +{BOSS_REWARD.treats} 🍖. Flawless (no mistakes, no power-ups): +{BOSS_FLAWLESS_KIBBLE} 🥣 more.
              </p>
            )}
            <p className="muted small">Bosses beaten: {bossesCleared(boss)}</p>
            {error && <p className="error">Could not create this week's boss: {error}</p>}
            <button className="btn primary big" disabled={!puzzle} onClick={() => setPlaying(true)}>
              {puzzle ? (record ? 'Climb again' : 'Start the climb') : 'Preparing the boss…'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
