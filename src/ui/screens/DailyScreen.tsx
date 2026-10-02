import { useCallback, useEffect, useState } from 'react';
import { POWER_UPS } from '../../core/economy/powerups';
import { currentStreak, dailyConfig, dateKey } from '../../core/progression/daily';
import type { Puzzle } from '../../core/puzzle/types';
import { useNav } from '../../store/navStore';
import { useSave, type PuzzleOutcome } from '../../store/saveStore';
import { sfx } from '../audio';
import { DogFace } from '../components/DogFace';
import { PuzzleSession } from '../components/PuzzleSession';
import { Stars, TopBar } from '../components/common';
import { generateInWorker } from '../generate';

export function DailyScreen() {
  const go = useNav((s) => s.go);
  const daily = useSave((s) => s.daily);
  const [today] = useState(() => dateKey());
  const cfg = dailyConfig(today);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let alive = true;
    generateInWorker({ size: cfg.size, seed: cfg.seed, maxDifficulty: cfg.maxDifficulty })
      .then((p) => alive && setPuzzle(p))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [cfg.size, cfg.seed, cfg.maxDifficulty]);

  const onWin = useCallback(
    (o: PuzzleOutcome) => {
      const r = useSave.getState().completeDaily(today, o);
      if (!r.firstTime) return { treats: 0, kibble: r.kibble, lines: ['Already solved today — come back tomorrow!'] };
      if (r.item) window.setTimeout(() => sfx('reward'), 1400);
      return {
        treats: r.treats,
        kibble: r.kibble,
        lines: [`🔥 Streak: ${r.streak} day${r.streak === 1 ? '' : 's'}`, r.item ? `🎁 ${POWER_UPS[r.item].icon} ${POWER_UPS[r.item].name}` : null].filter(
          Boolean,
        ),
      };
    },
    [today],
  );

  if (playing && puzzle) {
    return (
      <PuzzleSession
        sessionId={0}
        puzzle={puzzle}
        title="Daily Walk"
        subtitle={`📅 ${today} · ${cfg.label} · ${cfg.size}×${cfg.size}`}
        background="linear-gradient(180deg, #fff1d6 0%, #ffe3ec 100%)"
        resultTitle="Daily Walk complete!"
        onBack={() => go({ name: 'title' })}
        onWin={onWin}
      />
    );
  }

  const streak = currentStreak(daily, today);
  const doneStars = daily.completed[today];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dateKey(d);
    return { key, day: d.toLocaleDateString(undefined, { weekday: 'narrow' }), stars: daily.completed[key] ?? 0 };
  });

  return (
    <div className="screen daily-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="📅 Daily Walk" />
      <div className="card center">
        <div className="modal-dog">
          <DogFace breed={new Date().getDay()} />
        </div>
        <h2>{cfg.label}</h2>
        <p className="muted">
          A fresh {cfg.size}×{cfg.size} puzzle every day — the same for everyone.
        </p>
        <div className="streak-row">
          {last7.map((d) => (
            <div key={d.key} className={`streak-day ${d.stars ? 'done' : ''} ${d.key === today ? 'today' : ''}`}>
              <span>{d.day}</span>
              <b>{d.stars ? '🐾' : '·'}</b>
            </div>
          ))}
        </div>
        <p>
          🔥 Streak <b>{streak}</b> · Best <b>{daily.best}</b>
        </p>
        {doneStars ? (
          <>
            <Stars count={doneStars} />
            <p className="muted">Solved today! Replay just for fun (no extra rewards).</p>
          </>
        ) : (
          <p className="muted">First clear: treats (more with a longer streak) + 1 power-up.</p>
        )}
        {error && <p className="error">Could not create today's puzzle: {error}</p>}
        <button className="btn primary big" disabled={!puzzle} onClick={() => setPlaying(true)}>
          {puzzle ? (doneStars ? 'Play again' : 'Start walk') : 'Preparing puzzle…'}
        </button>
      </div>
    </div>
  );
}
