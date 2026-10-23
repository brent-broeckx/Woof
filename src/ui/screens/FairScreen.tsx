import { useEffect, useState } from 'react';
import { breedById, RARITY_LABEL } from '../../core/pet/breeds';
import { FAIR_PITY, FAIR_PRICE, FAIR_REFUND, fairOddsPercent } from '../../core/pet/pack';
import { dogRate } from '../../core/pet/yard';
import { useNav } from '../../store/navStore';
import { useSave, type AdoptionResult } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { Modal, TopBar } from '../components/common';
import { DogFace } from '../components/DogFace';

const REVEAL_MS = 1100;

export function FairScreen() {
  const go = useNav((s) => s.go);
  const treats = useSave((s) => s.treats);
  const fair = useSave((s) => s.fair);
  const [result, setResult] = useState<AdoptionResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const left = FAIR_PITY - fair.sinceRare;

  useEffect(() => {
    if (!result || revealed) return;
    const id = window.setTimeout(() => {
      setRevealed(true);
      const big = result.rarity === 'epic' || result.rarity === 'legendary';
      sfx(big ? 'win' : result.isNew ? 'reward' : 'star');
      haptic(big ? [30, 40, 30, 40, 60] : [20, 30, 20]);
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [result, revealed]);

  const adopt = () => {
    const r = useSave.getState().adoptFromFair();
    if (!r) return;
    sfx('click');
    setRevealed(false);
    setResult(r);
  };

  const close = () => setResult(null);

  return (
    <div className="screen fair-screen">
      <TopBar onBack={() => go({ name: 'yard' })} title="🎪 Adoption Fair" right={<span className="chip">🍖 {treats}</span>} />

      <div className="card fair-stall">
        <div className="fair-awning" aria-hidden />
        <div className="fair-crate" aria-hidden>
          📦
        </div>
        <p>Every pup here needs a home! Each adoption brings a random dog to your pack. Already have that breed? It levels up.</p>
        <button className="btn primary big" disabled={treats < FAIR_PRICE} onClick={adopt}>
          Adopt a pup · {FAIR_PRICE} 🍖
        </button>
        {treats < FAIR_PRICE && <p className="muted text-small">Collect treats from the yard jar to adopt.</p>}
        <p className="muted text-small">
          {left <= 1 ? 'Your next adoption is a guaranteed Rare or better!' : `Rare or better guaranteed within ${left} adoptions.`}
        </p>
      </div>

      <div className="card">
        <h3>Odds</h3>
        {fairOddsPercent().map(([rarity, pct]) => (
          <div key={rarity} className="pup-stat-row">
            <span className={`rarity-tag r-${rarity}`}>{RARITY_LABEL[rarity]}</span>
            <b>{pct.toFixed(0)}%</b>
          </div>
        ))}
        <p className="muted text-small">
          Every breed of a rarity is equally likely. Dogs level up from duplicates (max level 10); a duplicate of a max-level dog returns {FAIR_REFUND} 🍖.
          Results are fixed per adoption, so reloading never changes them.
        </p>
      </div>

      {result && (
        <Modal onClose={revealed ? close : () => undefined}>
          {!revealed ? (
            <div className="fair-reveal" aria-live="polite">
              <div className="fair-crate shaking">📦</div>
              <p>Who's in the crate…?</p>
            </div>
          ) : (
            <div className={`fair-reveal done r-glow-${result.rarity}`} aria-live="polite">
              {(result.rarity === 'epic' || result.rarity === 'legendary') && <Confetti />}
              <DogFace breed={result.breed} mood="happy" className="modal-dog fair-dog" />
              <h2>{breedById(result.breed).name}!</h2>
              <p>
                <span className={`rarity-tag r-${result.rarity}`}>{RARITY_LABEL[result.rarity]}</span>
              </p>
              <p className="reward">
                {result.isNew
                  ? `New pack member! +${dogRate({ breed: result.breed, level: 1 })} 🍖/h`
                  : result.refund
                    ? `Already max level · +${result.refund} 🍖 back`
                    : result.levelUp
                      ? `Level up! Now level ${result.level}`
                      : 'Duplicate! Closer to the next level.'}
              </p>
              <div className="modal-actions">
                <button className="btn ghost" onClick={close}>
                  Done
                </button>
                <button className="btn primary" disabled={treats < FAIR_PRICE} onClick={adopt}>
                  Again · {FAIR_PRICE} 🍖
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
