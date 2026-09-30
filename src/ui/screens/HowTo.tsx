import { POWER_UPS, POWER_UP_IDS } from '../../core/economy/powerups';
import { MINI_GAMES } from '../../minigames/registry';
import { useNav } from '../../store/navStore';
import { TopBar } from '../components/common';

export function HowTo() {
  const go = useNav((s) => s.go);
  return (
    <div className="screen howto-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="❓ How to play" />
      <div className="card">
        <h3>The rules</h3>
        <ul>
          <li>Place exactly <b>one dog in every row</b> and <b>every column</b>.</li>
          <li>Each coloured <b>yard</b> gets exactly one dog too.</li>
          <li>Dogs need space: two dogs can <b>never touch</b>, not even diagonally.</li>
          <li>Every puzzle has one solution, and you can always find it with logic. No guessing needed!</li>
        </ul>
      </div>
      <div className="card">
        <h3>Controls</h3>
        <ul>
          <li><b>Tap</b> a tile to cross it off (✕). Tap again to clear it.</li>
          <li><b>Double-tap</b>, <b>long-press</b> or <b>right-click</b> to place a dog.</li>
          <li><b>Drag</b> to cross off many tiles at once.</li>
          <li>Keyboard: arrow keys move, <kbd>Space</kbd> crosses, <kbd>Enter</kbd> places a dog.</li>
          <li>A wrong dog costs a 🦴 bone. Lose all 3 and the level is over. Then you can use power-ups or retry.</li>
        </ul>
      </div>
      <div className="card">
        <h3>Stars</h3>
        <p>★★★ no mistakes and no power-ups · ★★ at most 1 mistake and 1 power-up · ★ solved.</p>
      </div>
      <div className="card">
        <h3>🎁 Bonus levels</h3>
        <p>Every 5th level is a quick brain game. Finish it to win power-ups:</p>
        <ul>
          {Object.values(MINI_GAMES).map((g) => (
            <li key={g.id}>
              {g.icon} <b>{g.name}</b>: {g.tagline}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Power-ups</h3>
        <ul className="powerup-list">
          {POWER_UP_IDS.map((id) => (
            <li key={id}>
              {POWER_UPS[id].icon} <b>{POWER_UPS[id].name}</b>: {POWER_UPS[id].description}
            </li>
          ))}
        </ul>
        <p className="muted">You can use up to 3 power-ups per level.</p>
      </div>
    </div>
  );
}
