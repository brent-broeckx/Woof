import { Suspense, useState } from 'react';
import {
  ARCADE_DAILY_KIBBLE,
  ARCADE_DIFFICULTIES,
  arcadeKibble,
  arcadeSeed,
  arcadeUnlocks,
  difficultyById,
  difficultyUnlocked,
  kibbleLeftToday,
  MEDAL_NAMES,
  MEDALS,
  medalCounts,
  recordKey,
  type ArcadeDifficulty,
  type ArcadeRecord,
} from '../../core/progression/arcade';
import { dateKey } from '../../core/progression/daily';
import { MINI_GAME_IDS, type MiniGameId } from '../../core/progression/levels';
import { debugUnlockAll } from '../../debug/debugStore';
import { MINI_GAMES, type MiniGameResult } from '../../minigames/registry';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { formatTime, Modal, Stars, TopBar } from '../components/common';

function useUnlocks() {
  const progress = useSave((s) => s.progress);
  return arcadeUnlocks((id) => (progress[id]?.stars ?? 0) > 0, debugUnlockAll());
}

function Medal({ record }: { record: ArcadeRecord | undefined }) {
  if (!record) return <span className="medal empty" aria-label="No medal yet" />;
  return (
    <span className={`medal m${record.stars}`} aria-label={`${MEDAL_NAMES[record.stars]} medal`}>
      {MEDALS[record.stars]}
    </span>
  );
}

export function ArcadeScreen() {
  const go = useNav((s) => s.go);
  const arcade = useSave((s) => s.arcade);
  const kibble = useSave((s) => s.kibble);
  const { games, maxTier } = useUnlocks();
  const left = kibbleLeftToday(arcade, dateKey());
  const medals = medalCounts(arcade);
  const used = ARCADE_DAILY_KIBBLE - left;

  return (
    <div className="screen arcade-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🕹️ Arcade" right={<span className="chip">🥣 {kibble}</span>} />
      <div className="card arcade-head">
        <p className="muted text-small">Replay any mini-game you've met in a Bonus Park. Earn kibble for your pup and chase medals: 🥉 1★ · 🥈 2★ · 🥇 3★.</p>
        <div className="pup-stat-row">
          <span className="text-small">
            Today's kibble: <b>{used}</b>/{ARCADE_DAILY_KIBBLE} 🥣
          </span>
          <span className="text-small" aria-label={`${medals.gold} gold, ${medals.silver} silver, ${medals.bronze} bronze medals`}>
            🥇 {medals.gold} · 🥈 {medals.silver} · 🥉 {medals.bronze}
          </span>
        </div>
        <div
          className="fullness good"
          role="progressbar"
          aria-label="Arcade kibble today"
          aria-valuemin={0}
          aria-valuemax={ARCADE_DAILY_KIBBLE}
          aria-valuenow={used}
        >
          <div style={{ width: `${(used / ARCADE_DAILY_KIBBLE) * 100}%` }} />
        </div>
        {left === 0 && <p className="muted text-small">Kibble cap reached for today. Medals and bests still count!</p>}
      </div>

      {games.size === 0 && (
        <div className="card">
          <p>Clear your first Bonus Park (level 5) to unlock the Arcade.</p>
        </div>
      )}

      <div className="arcade-list">
        {MINI_GAME_IDS.map((id) => {
          const def = MINI_GAMES[id];
          const unlocked = games.has(id);
          return (
            <div key={id} className={`card arcade-game ${unlocked ? '' : 'locked'}`}>
              <div className="arcade-game-head">
                <span className="arcade-icon" aria-hidden>
                  {unlocked ? def.icon : '🔒'}
                </span>
                <div>
                  <h3>{unlocked ? def.name : 'Locked game'}</h3>
                  <p className="muted text-small">{unlocked ? def.tagline : 'Meet it in a Bonus Park to unlock.'}</p>
                </div>
              </div>
              {unlocked && (
                <div className="arcade-tiers">
                  {ARCADE_DIFFICULTIES.map((d) => {
                    const open = difficultyUnlocked(d.id, maxTier);
                    const record = arcade.records[recordKey(id, d.id)];
                    return (
                      <button
                        key={d.id}
                        className="arcade-tier"
                        disabled={!open}
                        aria-label={`${def.name} · ${d.name}${open ? '' : ' (locked)'}`}
                        onClick={() => go({ name: 'arcadePlay', game: id, difficulty: d.id })}
                      >
                        {open ? <Medal record={record} /> : <span className="medal empty">🔒</span>}
                        <span className="arcade-tier-name">{d.name}</span>
                        <small className="muted">{open ? (record ? formatTime(record.timeMs) : 'Play') : `Tier ${d.tier}`}</small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Phase =
  | { name: 'intro' }
  | { name: 'play'; startedAt: number }
  | {
      name: 'result';
      result: MiniGameResult;
      stars: number;
      timeMs: number;
      kibble: number;
      newBest: boolean;
      newMedal: number;
      previous: ArcadeRecord | null;
    };

export function ArcadePlayScreen({ game, difficulty }: { game: MiniGameId; difficulty: ArcadeDifficulty }) {
  const go = useNav((s) => s.go);
  const def = MINI_GAMES[game];
  const diff = difficultyById(difficulty) ?? ARCADE_DIFFICULTIES[0];
  const saveSeed = useSave((s) => s.seed);
  const plays = useSave((s) => s.arcade.plays);
  const record = useSave((s) => s.arcade.records[recordKey(game, diff.id)]);
  const left = useSave((s) => kibbleLeftToday(s.arcade, dateKey()));
  const { games, maxTier } = useUnlocks();
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const [attempt, setAttempt] = useState(0);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const Game = def.component;
  const exit = () => go({ name: 'arcade' });

  if (!games.has(game) || !difficultyUnlocked(diff.id, maxTier)) {
    return (
      <div className="screen">
        <TopBar onBack={exit} title="🕹️ Arcade" />
        <div className="card">
          <p>This game isn't unlocked yet.</p>
        </div>
      </div>
    );
  }

  const start = () => setPhase({ name: 'play', startedAt: Date.now() });

  const finish = (result: MiniGameResult) => {
    if (phase.name !== 'play') return;
    const stars = Math.max(1, result.stars);
    const timeMs = Date.now() - phase.startedAt;
    const run = useSave.getState().completeArcade(game, diff.id, stars, timeMs);
    setAttempt(0);
    setPhase({ name: 'result', result, stars, timeMs, ...run });
    sfx(run.newBest ? 'win' : 'star');
    if (run.newMedal) haptic([20, 30, 20]);
  };

  return (
    <div className="screen bonus-screen">
      <TopBar
        onBack={() => (phase.name === 'play' ? setConfirmQuit(true) : exit())}
        title={
          <>
            <div className="level-title">🕹️ Arcade · {diff.name}</div>
            <div className="level-sub">
              {def.icon} {def.name}
            </div>
          </>
        }
      />

      {phase.name === 'intro' && (
        <div className="card bonus-intro">
          <div className="bonus-icon">{def.icon}</div>
          <h2>{def.name}</h2>
          <p className="tagline">{def.tagline}</p>
          <ul>
            {def.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="muted">
            {record ? (
              <>
                Your best: {MEDALS[record.stars]} {'★'.repeat(record.stars)} in {formatTime(record.timeMs)}
              </>
            ) : (
              'No medal yet: any finish earns 🥉.'
            )}
          </p>
          <p className="muted text-small">
            {left > 0
              ? `Up to ${Math.min(left, arcadeKibble(3, diff.id))} 🥣 kibble per run (${left} left today).`
              : 'Daily kibble cap reached: playing for medals only.'}
          </p>
          <button className="btn primary big" onClick={start}>
            Play!
          </button>
        </div>
      )}

      {phase.name === 'play' && (
        <Suspense fallback={<div className="loading">Fetching the toys…</div>}>
          <Game key={`${plays}-${attempt}`} tier={diff.tier} seed={arcadeSeed(saveSeed, plays, attempt)} onFinish={finish} />
        </Suspense>
      )}

      {phase.name === 'play' && (
        <div className="center">
          <button className="link" onClick={() => setConfirmQuit(true)}>
            Quit run
          </button>
        </div>
      )}

      {confirmQuit && (
        <Modal onClose={() => setConfirmQuit(false)}>
          <h2>Quit this run?</h2>
          <p>Unfinished Arcade runs don't earn kibble or medals.</p>
          <div className="modal-actions column">
            <button
              className="btn primary"
              onClick={() => {
                setConfirmQuit(false);
                setAttempt((a) => a + 1);
                start();
              }}
            >
              New puzzle
            </button>
            <button className="btn" onClick={exit}>
              Back to Arcade
            </button>
            <button className="btn ghost" onClick={() => setConfirmQuit(false)}>
              Keep playing
            </button>
          </div>
        </Modal>
      )}

      {phase.name === 'result' && phase.newMedal === 3 && <Confetti />}
      {phase.name === 'result' && (
        <Modal>
          <h2>{phase.newBest ? 'New personal best!' : phase.stars >= 3 ? 'Pawsome!' : 'Good run!'}</h2>
          <Stars count={phase.stars} animate />
          <p className="result-line">
            {phase.result.summary} · ⏱️ {formatTime(phase.timeMs)}
          </p>
          {phase.newMedal > 0 && (
            <p className="reward">
              {MEDALS[phase.newMedal]} {MEDAL_NAMES[phase.newMedal]} medal!
            </p>
          )}
          {phase.previous && !phase.newBest && (
            <p className="muted text-small">
              Best: {'★'.repeat(phase.previous.stars)} in {formatTime(phase.previous.timeMs)}
            </p>
          )}
          {phase.kibble > 0 ? <p className="reward">+{phase.kibble} 🥣 kibble</p> : <p className="muted text-small">Daily kibble cap reached.</p>}
          <div className="modal-actions">
            <button className="btn" onClick={exit}>
              Arcade
            </button>
            <button className="btn primary" onClick={start}>
              Play again
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
