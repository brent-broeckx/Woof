import { useState } from 'react';
import { breedById, RARITY_LABEL } from '../../core/pet/breeds';
import { bondLevel, FEED_AMOUNT, FEED_COST, isFull, MAX_BOND, MAX_NAME, MOOD_LABEL, TRICKS, type TrickId } from '../../core/pet/pup';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { Modal, TopBar } from '../components/common';
import { PupAvatar } from '../components/PupAvatar';
import { FullnessBar, hungerHint, useFeed } from '../components/PupWidget';
import { usePup } from '../hooks/usePup';

const MOOD_TEXT = {
  happy: 'is having the best day ever!',
  content: 'is doing fine. A snack would be nice.',
  hungry: 'keeps staring at the food bowl…',
  sad: 'is starving. Solve a puzzle and grab some kibble!',
};

export function PupScreen() {
  const go = useNav((s) => s.go);
  const view = usePup();
  const kibble = useSave((s) => s.kibble);
  const { trick: fedTrick, note, feed } = useFeed();
  const [trick, setTrick] = useState<{ id: TrickId; key: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  if (!view) return null;
  const { pup, fullness, mood } = view;
  const bond = bondLevel(pup.bondXp);
  const breed = breedById(pup.breed);
  const days = Math.max(1, Math.ceil((Date.now() - pup.adoptedAt) / 86_400_000));

  return (
    <div className="screen pup-screen">
      <TopBar onBack={() => go({ name: 'title' })} title={`🐶 ${pup.name}`} right={<span className="chip">🥣 {kibble}</span>} />
      <div className={`card pup-hero mood-${mood}`}>
        <PupAvatar
          breed={pup.breed}
          mood={mood}
          interactive
          trick={!trick || (fedTrick && fedTrick.key > trick.key) ? fedTrick : trick}
          className="pup-hero-face"
        />
        <p className="center">
          <b>{pup.name}</b> {MOOD_TEXT[mood]}
        </p>
        <div className="pup-stat-row">
          <span>
            {MOOD_LABEL[mood]} · {note ?? hungerHint(fullness)}
          </span>
          <span className="muted">{Math.round(fullness)}%</span>
        </div>
        <FullnessBar value={fullness} />
        <button className="btn primary big" onClick={feed} disabled={isFull(fullness)}>
          🥣 Feed (−{FEED_COST} kibble, +{FEED_AMOUNT}%)
        </button>
        <p className="muted center text-small">Tap {pup.name} to pet. Earn kibble from every puzzle, daily walk, endless round and bonus game.</p>
      </div>

      <div className="card">
        <div className="pup-stat-row">
          <h3>💞 Bond level {bond.level}</h3>
          <span className="muted">{bond.level >= MAX_BOND ? 'Max!' : `${bond.into}/${bond.needed} xp`}</span>
        </div>
        <div className="bond-bar">
          <div style={{ width: `${bond.level >= MAX_BOND ? 100 : (100 * bond.into) / bond.needed}%` }} />
        </div>
        <p className="muted text-small">Feeding and winning puzzles together builds your bond and teaches new tricks.</p>
        <div className="trick-grid">
          {TRICKS.map((t) => {
            const unlocked = t.level <= bond.level;
            return (
              <button
                key={t.id}
                className={`chip trick ${unlocked ? '' : 'locked'}`}
                disabled={!unlocked}
                onClick={() => {
                  setTrick({ id: t.id, key: Date.now() });
                  sfx(t.id === 'heart' ? 'bark' : 'pop');
                }}
              >
                {unlocked ? t.emoji : '🔒'} {t.name}
                {!unlocked && <small> · Lv {t.level}</small>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card pup-facts">
        <div className="pup-stat-row">
          <span>Breed</span>
          <b>
            {breed.name} <span className={`rarity-tag r-${breed.rarity}`}>{RARITY_LABEL[breed.rarity]}</span>
          </b>
        </div>
        <div className="pup-stat-row">
          <span>Together for</span>
          <b>
            {days} day{days === 1 ? '' : 's'}
          </b>
        </div>
        <div className="pup-stat-row">
          <span>Meals eaten</span>
          <b>{pup.meals}</b>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => setRenaming(pup.name)}>
            ✏️ Rename
          </button>
          <button className="btn ghost" onClick={() => go({ name: 'kennel' })}>
            🎀 Outfits
          </button>
        </div>
      </div>

      {renaming !== null && (
        <Modal onClose={() => setRenaming(null)}>
          <h2>Rename your pup</h2>
          <input className="text-input" value={renaming} maxLength={MAX_NAME} onChange={(e) => setRenaming(e.target.value)} aria-label="New name" autoFocus />
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRenaming(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!renaming.trim()}
              onClick={() => {
                useSave.getState().renamePup(renaming);
                setRenaming(null);
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
