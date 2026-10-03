import { TOTAL_LEVELS } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { currentStreak } from '../../core/progression/daily';
import { badgeInput, nextUnplayed, useSave } from '../../store/saveStore';
import { claimableCount } from '../../core/progression/badges';
import { isoWeekKey } from '../../core/progression/boss';
import { DogFace } from '../components/DogFace';
import { DEBUG_AVAILABLE } from '../../debug/debugStore';
import { PupWidget } from '../components/PupWidget';
import { PupAvatar } from '../components/PupAvatar';
import { Modal } from '../components/common';
import { usePup, useTripsReady, useYard } from '../hooks/usePup';

export function Title() {
  const go = useNav((s) => s.go);
  const progress = useSave((s) => s.progress);
  const next = nextUnplayed(progress);
  const started = Object.keys(progress).length > 0;
  const daily = useSave((s) => s.daily);
  const streak = currentStreak(daily);
  const greeting = useNav((s) => s.greeting);
  const setGreeting = useNav((s) => s.setGreeting);
  const pup = usePup();
  const yard = useYard(15_000);
  const tripsReady = useTripsReady();
  const badgeClaims = useSave((s) => claimableCount(badgeInput(s), s.badges));
  const bossBeaten = useSave((s) => !!s.boss.records[isoWeekKey()]);

  return (
    <div className="screen title-screen">
      <div className="title-dogs">
        {[3, 0, 5, 1, 7].map((b, i) => (
          <DogFace key={b} breed={b} className={`title-dog d${i}`} />
        ))}
      </div>
      <h1 className="logo">
        Woof<span>doku</span>
      </h1>
      <p className="tagline">One pup per row, column and yard — and no touching!</p>
      <PupWidget />
      <div className="title-buttons">
        <button className="btn primary big" onClick={() => go({ name: 'level', id: next })}>
          {started ? `${next > TOTAL_LEVELS ? 'Keep playing' : 'Continue'} · Level ${next}` : 'Play'}
        </button>
        <button className="btn" onClick={() => go({ name: 'map' })}>
          🗺️ Level map
        </button>
        <button className={`btn yard-btn ${yard?.full ? 'jar-full' : ''}`} onClick={() => go({ name: 'yard' })}>
          🏡 Yard
          {tripsReady > 0 ? (
            <span className="yard-badge">🧭 Trip back!</span>
          ) : (
            yard && yard.ready > 0 && <span className="yard-badge">{yard.full ? 'Jar full!' : `🍖 ${yard.ready}`}</span>
          )}
        </button>
        <div className="row">
          <button className="btn" onClick={() => go({ name: 'daily' })}>
            📅 Daily{streak > 0 ? ` · 🔥${streak}` : ''}
          </button>
          <button className="btn" onClick={() => go({ name: 'endless' })}>
            ♾️ Endless
          </button>
          <button className="btn" onClick={() => go({ name: 'arcade' })}>
            🕹️ Arcade
          </button>
          <button className="btn" onClick={() => go({ name: 'boss' })}>
            🏔️ Boss{bossBeaten ? ' ✓' : ''}
          </button>
          <button className="btn" onClick={() => go({ name: 'cafe' })}>
            🐈 Cat Café
          </button>
        </div>
        <div className="row three">
          <button className="btn" onClick={() => go({ name: 'kennel' })}>
            🏠 Kennel
          </button>
          <button className="btn" onClick={() => go({ name: 'badges' })}>
            🏅 Badges{badgeClaims > 0 && <span className="yard-badge">{badgeClaims}</span>}
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
        {DEBUG_AVAILABLE && (
          <button className="btn ghost" onClick={() => go({ name: 'debug' })}>
            🛠️ Debug (dev only)
          </button>
        )}
      </div>
      {greeting !== null && pup && (
        <Modal onClose={() => setGreeting(null)}>
          <div className="modal-dog">
            <PupAvatar breed={pup.pup.breed} mood={pup.mood} trick={{ id: 'jump', key: 1 }} />
          </div>
          <h2>{pup.pup.name} missed you!</h2>
          <p>
            You were away for {formatAway(greeting)}.{' '}
            {pup.mood === 'happy' || pup.mood === 'content' ? 'Wanna solve some puzzles together?' : 'Their tummy is rumbling — time to earn some kibble!'}
          </p>
          <button className="btn primary" onClick={() => setGreeting(null)}>
            🐾 Hi buddy!
          </button>
        </Modal>
      )}
    </div>
  );
}

function formatAway(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `${d} days`;
}
