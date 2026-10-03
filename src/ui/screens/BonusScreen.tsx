import { Suspense, useState } from 'react';
import { POWER_UPS, type PowerUpId } from '../../core/economy/powerups';
import { TOTAL_LEVELS, type LevelEntry } from '../../core/progression/levels';
import { MINI_GAMES, type MiniGameResult } from '../../minigames/registry';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { Modal, Stars, TopBar } from '../components/common';

type BonusLevel = Extract<LevelEntry, { kind: 'bonus' }>;
type Phase =
  { name: 'intro' } | { name: 'play'; attempt: number } | { name: 'result'; result: MiniGameResult; items: PowerUpId[]; kibble: number; stars: number };

/** `debug` plays a mini-game from the dev debug screen without touching the save. */
export function BonusScreen({ level, debug = false }: { level: BonusLevel; debug?: boolean }) {
  const go = useNav((s) => s.go);
  const def = MINI_GAMES[level.game];
  const [phase, setPhase] = useState<Phase>({ name: 'intro' });
  const [confirmQuit, setConfirmQuit] = useState(false);
  const Game = def.component;
  const nextLevel = !debug && level.id < TOTAL_LEVELS ? level.id + 1 : null;
  const exit = () => go(debug ? { name: 'debug' } : { name: 'map' });

  const finish = (result: MiniGameResult) => {
    const stars = Math.max(1, result.stars);
    const { items, kibble } = debug ? { items: [], kibble: 0 } : useSave.getState().completeBonus(level.id, level.game, stars);
    setPhase({ name: 'result', result, items, kibble, stars });
    sfx('win');
    window.setTimeout(() => sfx('reward'), 600);
  };

  const attempt = phase.name === 'play' ? phase.attempt : 0;

  return (
    <div className="screen bonus-screen">
      <TopBar
        onBack={() => (phase.name === 'play' ? setConfirmQuit(true) : exit())}
        title={
          <>
            <div className="level-title">{debug ? `🛠️ Debug · tier ${level.tier}` : `🎁 Bonus · Level ${level.id}`}</div>
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
          <p className="muted">Every finish earns at least one power-up. More stars = more (and rarer) rewards!</p>
          <button className="btn primary big" onClick={() => setPhase({ name: 'play', attempt: 1 })}>
            Play!
          </button>
        </div>
      )}

      {phase.name === 'play' && (
        <Suspense fallback={<div className="loading">Fetching the toys…</div>}>
          <Game key={attempt} tier={level.tier} seed={level.seed + attempt - 1} onFinish={finish} />
        </Suspense>
      )}

      {phase.name === 'play' && level.game !== 'slidingPup' && (
        <div className="center">
          <button className="link" onClick={() => setConfirmQuit(true)}>
            Give up (still earns 1 reward)
          </button>
        </div>
      )}

      {confirmQuit && (
        <Modal onClose={() => setConfirmQuit(false)}>
          <h2>Leave the bonus?</h2>
          <p>You can finish now for a 1★ reward, or head back to the map and try later.</p>
          <div className="modal-actions column">
            <button
              className="btn primary"
              onClick={() => {
                setConfirmQuit(false);
                finish({ stars: 1, summary: 'Finished early' });
              }}
            >
              Take 1★ reward
            </button>
            <button className="btn" onClick={exit}>
              {debug ? 'Back to debug' : 'Back to map'}
            </button>
            <button className="btn ghost" onClick={() => setConfirmQuit(false)}>
              Keep playing
            </button>
          </div>
        </Modal>
      )}

      {phase.name === 'result' && phase.stars === 3 && <Confetti />}
      {phase.name === 'result' && (
        <Modal>
          <h2>{phase.result.stars >= 3 ? 'Pawsome!' : phase.result.stars >= 2 ? 'Good dog!' : 'Nice try!'}</h2>
          <Stars count={phase.stars} animate />
          <p className="result-line">{phase.result.summary}</p>
          {phase.kibble > 0 && <p className="reward">+{phase.kibble} 🥣 kibble</p>}
          {phase.items.length > 0 ? (
            <>
              <p>You earned:</p>
              <div className="reward-items">
                {phase.items.map((id, i) => (
                  <div key={i} className={`reward-item rarity-${POWER_UPS[id].rarity}`} style={{ animationDelay: `${i * 0.25}s` }}>
                    <span className="icon">{POWER_UPS[id].icon}</span>
                    <span>{POWER_UPS[id].name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Beat your best score here to earn more power-ups.</p>
          )}
          <div className="modal-actions">
            <button className="btn" onClick={exit}>
              {debug ? 'Debug' : 'Map'}
            </button>
            <button className="btn" onClick={() => setPhase({ name: 'play', attempt: attempt + 1 })}>
              Replay
            </button>
            {nextLevel && (
              <button className="btn primary" onClick={() => go({ name: 'level', id: nextLevel })}>
                Next →
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
