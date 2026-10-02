import { useState } from 'react';
import { POWER_UP_IDS } from '../core/economy/powerups';
import { BONUS_EVERY, MINI_GAME_IDS, TOTAL_LEVELS, type MiniGameId } from '../core/progression/levels';
import { MINI_GAMES } from '../minigames/registry';
import { useNav } from '../store/navStore';
import { useSave } from '../store/saveStore';
import { TopBar } from '../ui/components/common';
import { useDebug } from './debugStore';

const MAX_TIER = TOTAL_LEVELS / BONUS_EVERY;
const TIERS = Array.from({ length: MAX_TIER }, (_, i) => i + 1);
/** The tier a game first appears at in the campaign. */
const firstTier = (game: MiniGameId) => MINI_GAME_IDS.indexOf(game) + 1;

export function DebugScreen() {
  const go = useNav((s) => s.go);
  const unlockAll = useDebug((s) => s.unlockAll);
  const setUnlockAll = useDebug((s) => s.setUnlockAll);
  const [tiers, setTiers] = useState<Record<string, number>>(() => Object.fromEntries(MINI_GAME_IDS.map((g) => [g, firstTier(g)])));

  const play = (game: MiniGameId) => go({ name: 'debugGame', game, tier: tiers[game], seed: Math.floor(Math.random() * 2 ** 31) });

  return (
    <div className="screen settings-screen debug-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🛠️ Debug" />
      <div className="card">
        <label className="toggle">
          <div>
            <div className="name">Unlock all levels</div>
            <div className="desc">Every level on the map becomes playable. Your real progress is kept.</div>
          </div>
          <input type="checkbox" checked={unlockAll} onChange={(e) => setUnlockAll(e.target.checked)} />
        </label>
      </div>

      <div className="card">
        <h3>Play a mini-game</h3>
        <p className="muted">Random seed each time. Results are not saved and give no rewards.</p>
        {MINI_GAME_IDS.map((game) => (
          <div key={game} className="toggle">
            <div>
              <div className="name">
                {MINI_GAMES[game].icon} {MINI_GAMES[game].name}
              </div>
              <div className="desc">First appears at tier {firstTier(game)}</div>
            </div>
            <div className="row">
              <select aria-label={`${MINI_GAMES[game].name} tier`} value={tiers[game]} onChange={(e) => setTiers({ ...tiers, [game]: Number(e.target.value) })}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    Tier {t}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={() => play(game)}>
                Play
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Inventory</h3>
        <div className="row">
          <button
            className="btn"
            onClick={() =>
              useSave.setState((s) => ({ inventory: Object.fromEntries(POWER_UP_IDS.map((id) => [id, s.inventory[id] + 5])) as typeof s.inventory }))
            }
          >
            +5 every power-up
          </button>
          <button className="btn" onClick={() => useSave.setState((s) => ({ treats: s.treats + 1000 }))}>
            +1000 🍖
          </button>
          <button className="btn" onClick={() => useSave.getState().debugAddKibble(100)}>
            +100 🥣
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Time travel</h3>
        <p className="muted">Pretends this much time passed (hunger, production, timers). Reload the page to see the “missed you” greeting.</p>
        <div className="row">
          {[1, 8, 24].map((h) => (
            <button key={h} className="btn" onClick={() => useSave.getState().debugTimeTravel(h * 3_600_000)}>
              +{h}h
            </button>
          ))}
          <button className="btn danger" onClick={() => useSave.setState({ pup: null })}>
            Re-adopt pup
          </button>
        </div>
      </div>
    </div>
  );
}
