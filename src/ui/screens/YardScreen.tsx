import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DECOR, DECOR_COLS, decorById, decorUnlocked } from '../../core/economy/decor';
import { breedById, RARITY_LABEL } from '../../core/pet/breeds';
import { FEED_COST, isFull, MOOD_LABEL } from '../../core/pet/pup';
import { dogRate, JAR_HOURS, hoursUntilFull } from '../../core/pet/yard';
import { useNav } from '../../store/navStore';
import { dogName, useSave, yardPack } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Modal, TopBar } from '../components/common';
import { DogFace } from '../components/DogFace';
import { FullnessBar, useFeed } from '../components/PupWidget';
import { usePup, useTripsReady, useYard } from '../hooks/usePup';
import { canShareImage, captureYard, downloadBlob, photoFile } from '../yardPhoto';

/** How many pack dogs are drawn in the yard scene. */
const YARD_SHOWN = 6;
const YARD_SPOTS: CSSProperties[] = [
  { left: '18%', bottom: '4%', animationDelay: '-2s' },
  { left: '66%', bottom: '18%', animationDelay: '-5s' },
  { left: '30%', bottom: '30%', animationDelay: '-1s' },
  { left: '78%', bottom: '2%', animationDelay: '-7s' },
  { left: '48%', bottom: '24%', animationDelay: '-3s' },
];

const DECOR_ROW_BOTTOM = ['38%', '20%', '3%'];
const slotStyle = (slot: number): CSSProperties => ({
  left: `${2 + (slot % DECOR_COLS) * 16}%`,
  bottom: DECOR_ROW_BOTTOM[Math.floor(slot / DECOR_COLS)],
});

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
  const expeditions = useSave((s) => s.expeditions);
  const tripsReady = useTripsReady(5000);
  const view = usePup();
  const yard = useYard();
  const { note, feed } = useFeed();
  const [burst, setBurst] = useState<{ amount: number; key: number } | null>(null);
  const cosmetics = useSave((s) => s.cosmetics);
  const chests = useSave((s) => s.chests);
  const [editing, setEditing] = useState(false);
  const [brush, setBrush] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);
  if (!view || !yard) return null;
  const { pup, fullness, mood } = view;
  const pack = yardPack({ pup, pack: packDogs, expeditions });
  const exploring = expeditions.trips.reduce((n, t) => n + t.dogs.length, 0);
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

  const unlockedDecor = DECOR.filter((d) => decorUnlocked(d.id, cosmetics.owned, chests));
  const tapSlot = (slot: number) => {
    const current = cosmetics.decor[slot];
    const next = brush === null || current === brush ? null : brush;
    if (useSave.getState().placeDecor(slot, next)) sfx('pop');
  };

  const takePhoto = async () => {
    if (!sceneRef.current) return;
    setPhotoError(null);
    try {
      const blob = await captureYard(sceneRef.current, `${pup.name}'s yard`);
      sfx('reward');
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Could not take the photo');
    }
  };
  const fileName = `${pup.name.replace(/[^\w-]+/g, '-') || 'pup'}-yard.png`;
  const sharePhoto = async () => {
    if (!photo) return;
    const file = photoFile(photo.blob, fileName);
    try {
      await navigator.share({ files: [file], title: `${pup.name}'s yard`, text: 'Look at my Woofdoku yard! 🐶' });
    } catch {
      // Cancelled or not allowed: nothing to do.
    }
  };

  return (
    <div className="screen yard-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🏡 Yard" right={<span className="chip">🍖 {treats}</span>} />

      <div ref={sceneRef} className={`yard-scene mood-${mood} ${editing ? 'editing' : ''}`} aria-label={`${pup.name} playing in the yard`}>
        {cosmetics.decor.map((id, slot) => {
          const def = id ? decorById(id) : undefined;
          return def ? (
            <span key={slot} className={`yard-deco row-${Math.floor(slot / DECOR_COLS)}`} style={slotStyle(slot)}>
              {def.emoji}
            </span>
          ) : null;
        })}
        {shown.map((p, i) => (
          <div key={p.breed} className={`yard-dog ${i === 0 ? 'main' : 'extra'}`} style={i === 0 ? undefined : YARD_SPOTS[i - 1]}>
            <DogFace breed={p.breed} mood={mood === 'happy' ? 'happy' : mood === 'sad' ? 'sad' : 'calm'} />
          </div>
        ))}
        {(mood === 'hungry' || mood === 'sad') && <span className="yard-bowl">🥣</span>}
        {editing &&
          cosmetics.decor.map((id, slot) => (
            <button
              key={slot}
              className="decor-slot"
              style={slotStyle(slot)}
              aria-label={`Yard spot ${slot + 1}${id ? `: ${decorById(id)?.name ?? id}` : ', empty'}`}
              onClick={() => tapSlot(slot)}
            />
          ))}
      </div>

      <div className="row yard-tools">
        <button className={`btn small ${editing ? 'primary' : ''}`} onClick={() => setEditing((e) => !e)}>
          {editing ? '✓ Done' : '🎨 Decorate'}
        </button>
        <button className="btn small" disabled={editing} onClick={takePhoto}>
          📸 Photo
        </button>
      </div>
      {photoError && <p className="error center">{photoError}</p>}

      {editing && (
        <div className="card decor-palette">
          <p className="muted text-small">Pick an item, then tap spots in the yard. Tap a spot again to clear it.</p>
          <div className="decor-choices">
            <button className={`decor-choice ${brush === null ? 'on' : ''}`} aria-pressed={brush === null} onClick={() => setBrush(null)}>
              <span>🧹</span>
              <small>Clear</small>
            </button>
            {unlockedDecor.map((d) => (
              <button key={d.id} className={`decor-choice ${brush === d.id ? 'on' : ''}`} aria-pressed={brush === d.id} onClick={() => setBrush(d.id)}>
                <span>{d.emoji}</span>
                <small>{d.name}</small>
              </button>
            ))}
          </div>
          <button className="btn small ghost" onClick={() => go({ name: 'kennel' })}>
            More decor in the 🏠 Kennel
          </button>
        </div>
      )}

      {photo && (
        <Modal onClose={() => setPhoto(null)}>
          <h2>📸 Say cheese!</h2>
          <img className="yard-photo" src={photo.url} alt={`Photo of ${pup.name}'s yard`} />
          <div className="row">
            {canShareImage(photoFile(photo.blob, fileName)) && (
              <button className="btn primary" onClick={sharePhoto}>
                Share
              </button>
            )}
            <button className="btn" onClick={() => downloadBlob(photo.blob, fileName)}>
              Save image
            </button>
            <button className="btn ghost" onClick={() => setPhoto(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      <div className="row yard-nav">
        <button className="btn" onClick={() => go({ name: 'pack' })}>
          🐕 Pack <span className="muted">({packDogs.length})</span>
        </button>
        <button className="btn yard-btn" onClick={() => go({ name: 'expeditions' })}>
          🧭 Trips
          {tripsReady > 0 ? <span className="yard-badge">Back!</span> : exploring > 0 && <span className="muted"> ({exploring} away)</span>}
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
        {exploring > 0 && (
          <p className="muted text-small">
            🧭 {exploring} {exploring === 1 ? 'dog is' : 'dogs are'} on an expedition and not producing.
          </p>
        )}
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
