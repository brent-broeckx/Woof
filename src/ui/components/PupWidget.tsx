import { useState } from 'react';
import { breedById } from '../../core/pet/breeds';
import { FEED_COST, hoursUntilHungry, isFull, MOOD_LABEL, type TrickId } from '../../core/pet/pup';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { usePup } from '../hooks/usePup';
import { PupAvatar } from './PupAvatar';

export function FullnessBar({ value }: { value: number }) {
  const pct = Math.round(value);
  const tone = value >= 70 ? 'good' : value >= 40 ? 'ok' : value >= 15 ? 'low' : 'empty';
  return (
    <div className={`fullness ${tone}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Fullness">
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Feed button + its own trick trigger; shared by the title widget and pup screen. */
export function useFeed() {
  const [trick, setTrick] = useState<{ id: TrickId; key: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const feed = () => {
    if (useSave.getState().feedPup()) {
      sfx('reward');
      setTrick({ id: 'jump', key: Date.now() });
      setNote('Nom nom! 😋');
    } else {
      setNote(useSave.getState().kibble < FEED_COST ? 'Not enough kibble — solve a puzzle!' : 'Too full right now!');
    }
    window.setTimeout(() => setNote(null), 1800);
  };
  return { trick, note, feed };
}

export function hungerHint(fullness: number): string {
  const h = hoursUntilHungry(fullness);
  if (h <= 0) return 'Needs food!';
  if (h < 1) return 'Hungry soon';
  return `Hungry in ~${Math.round(h)}h`;
}

/** Compact pup card shown on the title screen. */
export function PupWidget() {
  const view = usePup();
  const kibble = useSave((s) => s.kibble);
  const go = useNav((s) => s.go);
  const { trick, note, feed } = useFeed();
  if (!view) return null;
  const { pup, fullness, mood } = view;
  const full = isFull(fullness);

  return (
    <div className={`pup-widget mood-${mood}`}>
      <PupAvatar breed={pup.breed} mood={mood} interactive trick={trick} className="pup-widget-face" />
      <div className="pup-widget-info">
        <button className="link pup-name" onClick={() => go({ name: 'pup' })}>
          {pup.name} <span className="muted">· {breedById(pup.breed).name} ›</span>
        </button>
        <div className="pup-mood">
          {MOOD_LABEL[mood]} · <span className="muted">{note ?? hungerHint(fullness)}</span>
        </div>
        <FullnessBar value={fullness} />
      </div>
      <button className="btn small primary pup-feed" onClick={feed} disabled={full} title={full ? 'Too full' : `Feed (${FEED_COST} kibble)`}>
        Feed
        <span className="pup-kibble">−{FEED_COST} 🥣</span>
      </button>
      <div className="pup-widget-kibble" aria-label={`${kibble} kibble`}>
        🥣 {kibble}
      </div>
    </div>
  );
}
