import { useState } from 'react';
import { POWER_UPS, POWER_UP_IDS } from '../../core/economy/powerups';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { TopBar } from '../components/common';

export function Kennel() {
  const go = useNav((s) => s.go);
  const inventory = useSave((s) => s.inventory);
  const treats = useSave((s) => s.treats);
  const buy = useSave((s) => s.buyPowerUp);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div className="screen kennel-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🏠 Kennel" right={<span className="chip">🍖 {treats}</span>} />
      <p className="muted center">Earn 🍖 treats by beating puzzles with more stars. Win power-ups in 🎁 bonus levels.</p>
      <div className="kennel-list">
        {POWER_UP_IDS.map((id) => {
          const def = POWER_UPS[id];
          return (
            <div key={id} className={`kennel-item rarity-${def.rarity} ${flash === id ? 'flash' : ''}`}>
              <div className="icon">{def.icon}</div>
              <div className="info">
                <div className="name">
                  {def.name} <span className="rarity">{def.rarity}</span>
                </div>
                <div className="desc">{def.description}</div>
              </div>
              <div className="owned">×{inventory[id]}</div>
              <button
                className="btn small"
                disabled={treats < def.price}
                onClick={() => {
                  if (buy(id)) {
                    setFlash(id);
                    window.setTimeout(() => setFlash(null), 500);
                  }
                }}
              >
                🍖 {def.price}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
