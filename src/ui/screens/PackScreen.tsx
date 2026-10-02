import { useState } from 'react';
import { BREED_CATALOG, breedById, RARITY_LABEL } from '../../core/pet/breeds';
import { MAX_NAME } from '../../core/pet/pup';
import { copiesForLevel, MAX_DOG_LEVEL, trainCost, type PackDog } from '../../core/pet/pack';
import { dogRate } from '../../core/pet/yard';
import { useNav } from '../../store/navStore';
import { dogName, useSave } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Modal, TopBar } from '../components/common';
import { DogFace } from '../components/DogFace';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const SOURCE_LABEL: Record<PackDog['source'], string> = { starter: 'Your first pup', story: 'Rescued on a walk', fair: 'Adoption Fair' };

export function PackScreen() {
  const go = useNav((s) => s.go);
  const pup = useSave((s) => s.pup);
  const pack = useSave((s) => s.pack);
  const treats = useSave((s) => s.treats);
  const [open, setOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const owned = new Set(pack.map((d) => d.breed));
  const dog = open ? pack.find((d) => d.breed === open) : undefined;

  return (
    <div className="screen pack-screen">
      <TopBar onBack={() => go({ name: 'yard' })} title="🐕 Pack" right={<span className="chip">🍖 {treats}</span>} />
      <p className="muted center">
        {owned.size} / {BREED_CATALOG.length} breeds collected. Every dog adds treats to the yard jar.
      </p>

      <div className="pack-grid">
        {BREED_CATALOG.map((b) => {
          const d = pack.find((x) => x.breed === b.id);
          if (!d)
            return (
              <div key={b.id} className={`pack-card locked r-border-${b.rarity}`} aria-label={`${RARITY_LABEL[b.rarity]} breed not adopted yet`}>
                <DogFace breed={b.id} mood="calm" className="pack-face silhouette" />
                <span className="pack-name">???</span>
                <span className={`rarity-tag r-${b.rarity}`}>{RARITY_LABEL[b.rarity]}</span>
              </div>
            );
          return (
            <button key={b.id} className={`pack-card r-border-${b.rarity}`} onClick={() => setOpen(b.id)}>
              {pup?.breed === b.id && (
                <span className="pack-main" title="Main pup">
                  ⭐
                </span>
              )}
              <DogFace breed={b.id} mood="happy" className="pack-face" />
              <span className="pack-name">{dogName({ pup }, d)}</span>
              <span className="pack-level">Lv {d.level}</span>
            </button>
          );
        })}
      </div>

      <button className="btn primary" onClick={() => go({ name: 'fair' })}>
        🎪 Adoption Fair
      </button>

      {dog && (
        <Modal onClose={() => setOpen(null)}>
          <DogFace breed={dog.breed} mood="happy" className="modal-dog" />
          <h2>{dogName({ pup }, dog)}</h2>
          <p>
            {breedById(dog.breed).name} · <span className={`rarity-tag r-${breedById(dog.breed).rarity}`}>{RARITY_LABEL[breedById(dog.breed).rarity]}</span>
          </p>
          <p className="muted text-small">{SOURCE_LABEL[dog.source]}</p>
          <div className="pup-stat-row">
            <span>Level</span>
            <b>
              {dog.level} / {MAX_DOG_LEVEL}
            </b>
          </div>
          <div className="pup-stat-row">
            <span>Production</span>
            <b>{fmt(dogRate(dog))} 🍖/h</b>
          </div>
          {dog.level < MAX_DOG_LEVEL && (
            <>
              <div className="pup-stat-row">
                <span>Duplicates to next level</span>
                <b>
                  {dog.copies} / {copiesForLevel(dog.level)}
                </b>
              </div>
              <div className="fullness good" aria-hidden>
                <div style={{ width: `${(dog.copies / copiesForLevel(dog.level)) * 100}%` }} />
              </div>
            </>
          )}
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRenaming(dogName({ pup }, dog))}>
              ✏️ Rename
            </button>
            {dog.level < MAX_DOG_LEVEL ? <TrainButton dog={dog} treats={treats} /> : <span className="chip">Max level!</span>}
          </div>
        </Modal>
      )}

      {dog && renaming !== null && (
        <Modal onClose={() => setRenaming(null)}>
          <h2>Rename</h2>
          <input className="text-input" value={renaming} maxLength={MAX_NAME} onChange={(e) => setRenaming(e.target.value)} aria-label="New name" autoFocus />
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRenaming(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!renaming.trim()}
              onClick={() => {
                useSave.getState().renameDog(dog.breed, renaming);
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

function TrainButton({ dog, treats }: { dog: PackDog; treats: number }) {
  const cost = trainCost(breedById(dog.breed).rarity, dog.level);
  return (
    <button
      className="btn primary"
      disabled={treats < cost}
      onClick={() => {
        if (!useSave.getState().trainDog(dog.breed)) return;
        sfx('star');
        haptic(20);
      }}
    >
      🎓 Train −{cost} 🍖
    </button>
  );
}
