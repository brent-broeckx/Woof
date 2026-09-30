import { useState } from 'react';
import { ACCESSORIES, BOARD_THEMES } from '../../core/economy/cosmetics';
import { POWER_UPS, POWER_UP_IDS } from '../../core/economy/powerups';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { DogFace } from '../components/DogFace';
import { TopBar } from '../components/common';

type Tab = 'powerups' | 'themes' | 'accessories';

export function Kennel() {
  const go = useNav((s) => s.go);
  const inventory = useSave((s) => s.inventory);
  const treats = useSave((s) => s.treats);
  const cosmetics = useSave((s) => s.cosmetics);
  const { buyPowerUp, buyCosmetic, equipTheme, equipAccessory } = useSave.getState();
  const [tab, setTab] = useState<Tab>('powerups');
  const [flash, setFlash] = useState<string | null>(null);

  const bought = (id: string) => {
    sfx('reward');
    setFlash(id);
    window.setTimeout(() => setFlash(null), 500);
  };

  const cosmeticButton = (id: string, price: number, equipped: boolean, equip: () => void) => {
    if (equipped) return <span className="chip on">Equipped</span>;
    if (cosmetics.owned.includes(id))
      return (
        <button className="btn small" onClick={equip}>
          Use
        </button>
      );
    return (
      <button
        className="btn small"
        disabled={treats < price}
        onClick={() => {
          if (buyCosmetic(id)) {
            bought(id);
            equip();
          }
        }}
      >
        🍖 {price}
      </button>
    );
  };

  return (
    <div className="screen kennel-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="🏠 Kennel" right={<span className="chip">🍖 {treats}</span>} />
      <div className="tabs" role="tablist">
        {(
          [
            ['powerups', '⚡ Power-ups'],
            ['themes', '🎨 Boards'],
            ['accessories', '🎀 Outfits'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'powerups' && (
        <>
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
                  <button className="btn small" disabled={treats < def.price} onClick={() => buyPowerUp(id) && bought(id)}>
                    🍖 {def.price}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'themes' && (
        <div className="kennel-list">
          {BOARD_THEMES.map((t) => (
            <div key={t.id} className={`kennel-item ${flash === t.id ? 'flash' : ''}`}>
              <div className="theme-swatch" aria-hidden="true">
                {t.regionColors.slice(0, 9).map((c, i) => (
                  <span key={i} style={{ background: c, borderColor: t.border }} />
                ))}
              </div>
              <div className="info">
                <div className="name">
                  {t.icon} {t.name}
                </div>
                <div className="desc">{t.price ? 'A fresh look for every yard.' : 'The original pastel yards.'}</div>
              </div>
              {cosmeticButton(t.id, t.price, cosmetics.boardTheme === t.id, () => equipTheme(t.id))}
            </div>
          ))}
        </div>
      )}

      {tab === 'accessories' && (
        <div className="kennel-list">
          {ACCESSORIES.map((a) => (
            <div key={a.id} className={`kennel-item ${flash === a.id ? 'flash' : ''}`}>
              <div className="icon accessory-preview">
                <DogFace breed={0} accessory={a.id} />
              </div>
              <div className="info">
                <div className="name">
                  {a.icon} {a.name}
                </div>
                <div className="desc">Worn by every pup you place on the board.</div>
              </div>
              {cosmeticButton(a.id, a.price, cosmetics.accessory === a.id, () => equipAccessory(a.id))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
