import { useState, type CSSProperties } from 'react';
import { breedById, RARITY_LABEL } from '../../core/pet/breeds';
import { FEED_COST, isFull, MOOD_LABEL } from '../../core/pet/pup';
import { dogRate, JAR_HOURS, hoursUntilFull } from '../../core/pet/yard';
import { useNav } from '../../store/navStore';
import { dogName, useSave, yardPack } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { TopBar } from '../components/common';
import { DogFace } from '../components/DogFace';
import { FullnessBar, useFeed } from '../components/PupWidget';
import { usePup, useYard } from '../hooks/usePup';

/** How many pack dogs are drawn in the yard scene. */
const YARD_SHOWN = 6;
const YARD_SPOTS: CSSProperties[] = [
  { left: '18%', bottom: '4%', animationDelay: '-2s' },
  { left: '66%', bottom: '18%', animationDelay: '-5s' },
  { left: '30%', bottom: '30%', animationDelay: '-1s' },
  { left: '78%', bottom: '2%', animationDelay: '-7s' },
  { left: '48%', bottom: '24%', animationDelay: '-3s' },
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function formatHours(h: number): string {
  if (h < 1 / 60) return 'any second';
  if (h < 1) return `${Math.ceil(h * 60)} min`;
  const total = Math.round(h * 60);
  const whole = Math.floor(total / 60);
  const min = total % 60;
  return min ? `${whole}h ${min}m` : `${whole}h`;
}

export function YardScreen() {
  const go = useNav((s) => s.go);
  const treats = useSave((s) => s.treats);
  const kibble = useSave((s) => s.kibble);
  const packDogs = useSave((s) => s.pack);
  const view = usePup();
  const yard = useYard();
  const { note, feed } = useFeed();
  const [burst, setBurst] = useState<{ amount: number; key: number } | null>(null);
  if (!view || !yard) return null;
  const { pup, fullness, mood } = view;
  const pack = yardPack({ pup, pack: packDogs });
  const shown = pack.slice(0, YARD_SHOWN);
  const pct = Math.min(100, (yard.jar / yard.capacity) * 100);
  const boosted = yard.mult > 1;

  const collect = () => {
    const amount = useSave.getState().collectTreats();
    if (amount <= 0) return;
    sfx('reward');
    haptic([20, 30, 20]);
    setBurst({ amount, key: Date.now() });
  };

  return (
    <div className="screen yard-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🏡 Yard" right={<span className="chip">🍖 {treats}</span>} />

      <div className={`yard-scene mood-${mood}`} aria-label={`${pup.name} playing in the yard`}>
        <span className="yard-deco tree">🌳</span>
        <span className="yard-deco bush">🌼</span>
        <span className="yard-deco house">🏠</span>
        {shown.map((p, i) => (
          <div key={p.breed} className={`yard-dog ${i === 0 ? 'main' : 'extra'}`} style={i === 0 ? undefined : YARD_SPOTS[i - 1]}>
            <DogFace breed={p.breed} mood={mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : 'calm'} />
          </div>
        ))}
        {(mood === 'hungry' || mood === 'sad') && <span className="yard-bowl">🥣</span>}
      </div>

      <div className="row yard-nav">
        <button className="btn" onClick={() => go({ name: 'pack' })}>
          🐕 Pack <span className="muted">({pack.length})</span>
        </button>
        <button className="btn primary" onClick={() => go({ name: 'fair' })}>
          🎪 Adoption Fair
        </button>
      </div>

      <div className="card yard-jar-card">
        <div className={`treat-jar ${yard.full ? 'full' : ''}`} aria-hidden>
          <div className="treat-jar-fill" style={{ height: `${pct}%` }} />
          <span className="treat-jar-icon">🍖</span>
          {burst && (
            <span key={burst.key} className="treat-burst">
              +{burst.amount} 🍖
            </span>
          )}
        </div>
        <div className="yard-jar-info">
          <h3>Treat jar</h3>
          <p className="yard-jar-count">
            <b>{yard.ready}</b> <span className="muted">/ {yard.capacity}</span>
          </p>
          <p className="muted text-small">
            {yard.full ? 'The jar is full! Collect it to keep production going.' : `Full in ${formatHours(hoursUntilFull(yard.jar, yard.rate, yard.mult))}`}
          </p>
          <button className="btn primary" disabled={yard.ready < 1} onClick={collect}>
            Collect {yard.ready > 0 ? `${yard.ready} ` : ''}🍖
          </button>
        </div>
      </div>

      <div className="card">
        <div className="pup-stat-row">
          <h3>Production</h3>
          <b>{fmt(yard.rate * yard.mult)} 🍖/h</b>
        </div>
        {pack.slice(0, 5).map((p) => {
          const b = breedById(p.breed);
          return (
            <div key={p.breed} className="pup-stat-row">
              <span>
                {dogName({ pup }, { breed: p.breed, name: packDogs.find((d) => d.breed === p.breed)?.name ?? '' })}{' '}
                <span className={`rarity-tag r-${b.rarity}`}>{RARITY_LABEL[b.rarity]}</span> <span className="muted text-small">Lv {p.level}</span>
              </span>
              <span>{fmt(dogRate(p))}/h</span>
            </div>
          );
        })}
        {pack.length > 5 && <p className="muted text-small">…and {pack.length - 5} more in your pack.</p>}
        <div className="pup-stat-row">
          <span>
            {pup.name}'s mood: {MOOD_LABEL[mood]}
          </span>
          <b className={boosted ? 'good-text' : yard.mult < 1 ? 'bad-text' : ''}>×{yard.mult}</b>
        </div>
        <FullnessBar value={fullness} />
        <div className="pup-stat-row">
          <span className="muted text-small">
            {note ?? (mood === 'happy' ? `A happy pup boosts the whole yard. Keep ${pup.name} fed!` : `Feed ${pup.name} to boost production (Happy = ×1.5).`)}
          </span>
          <button className="btn small primary" disabled={isFull(fullness)} onClick={feed}>
            Feed −{FEED_COST} 🥣
          </button>
        </div>
        <p className="muted text-small">
          You have {kibble} 🥣 kibble. The jar holds {JAR_HOURS}h of production, so check in twice a day.
        </p>
      </div>
    </div>
  );
}
