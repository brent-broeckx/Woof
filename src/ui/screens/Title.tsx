import { TOTAL_LEVELS } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { currentStreak } from '../../core/progression/daily';
import { highestUnlocked, useSave } from '../../store/saveStore';
import { DogFace } from '../components/DogFace';

export function Title() {
  const go = useNav((s) => s.go);
  const progress = useSave((s) => s.progress);
  const next = Math.min(TOTAL_LEVELS, highestUnlocked(progress));
  const started = Object.keys(progress).length > 0;
  const accessory = useSave((s) => s.cosmetics.accessory);
  const daily = useSave((s) => s.daily);
  const streak = currentStreak(daily);

  return (
    <div className="screen title-screen">
      <div className="title-dogs">
        {[3, 0, 5, 1, 7].map((b, i) => (
          <DogFace key={b} breed={b} className={`title-dog d${i}`} accessory={i === 2 ? accessory : 'none'} />
        ))}
      </div>
      <h1 className="logo">
        Woof<span>doku</span>
      </h1>
      <p className="tagline">One pup per row, column and yard — and no touching!</p>
      <div className="title-buttons">
        <button className="btn primary big" onClick={() => go({ name: 'level', id: next })}>
          {started ? `Continue · Level ${next}` : 'Play'}
        </button>
        <button className="btn" onClick={() => go({ name: 'map' })}>
          🗺️ Level map
        </button>
        <div className="row">
          <button className="btn" onClick={() => go({ name: 'daily' })}>
            📅 Daily{streak > 0 ? ` · 🔥${streak}` : ''}
          </button>
          <button className="btn" onClick={() => go({ name: 'endless' })}>
            ♾️ Endless
          </button>
        </div>
        <div className="row">
          <button className="btn" onClick={() => go({ name: 'kennel' })}>
            🏠 Kennel
          </button>
          <button className="btn" onClick={() => go({ name: 'stats' })}>
            📊 Stats
          </button>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => go({ name: 'howto' })}>
            ❓ How to play
          </button>
          <button className="btn ghost" onClick={() => go({ name: 'settings' })}>
            ⚙️ Settings
          </button>
        </div>
      </div>
    </div>
  );
}
