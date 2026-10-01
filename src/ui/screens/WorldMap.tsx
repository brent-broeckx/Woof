import { useEffect, useRef, useState } from 'react';
import { POWER_UPS, type PowerUpId } from '../../core/economy/powerups';
import { MINI_GAMES } from '../../minigames/registry';
import { BONUS_EVERY, LEVELS_PER_WORLD, WORLDS, getLevel } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { highestUnlocked, nextUnplayed, useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { Modal, TopBar } from '../components/common';

export function WorldMap() {
  const go = useNav((s) => s.go);
  const progress = useSave((s) => s.progress);
  const treats = useSave((s) => s.treats);
  const unlocked = highestUnlocked(progress);
  const current = nextUnplayed(progress);
  const currentRef = useRef<HTMLButtonElement>(null);
  const chests = useSave((s) => s.chests);
  const [chest, setChest] = useState<{ world: number; items: PowerUpId[]; treats: number } | null>(null);

  const openChest = (world: number) => {
    const reward = useSave.getState().openChest(world);
    if (!reward) return;
    sfx('reward');
    setChest({ world, ...reward });
  };

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="screen map-screen">
      <TopBar
        onBack={() => go({ name: 'title' })}
        title="Level map"
        right={
          <button className="chip" onClick={() => go({ name: 'kennel' })}>
            🍖 {treats}
          </button>
        }
      />
      {WORLDS.map((world) => {
        const first = (world.id - 1) * LEVELS_PER_WORLD + 1;
        const ids = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => first + i);
        const stars = ids.reduce((sum, id) => sum + (progress[id]?.stars ?? 0), 0);
        const locked = first > unlocked;
        const complete = ids.every((id) => progress[id]);
        const opened = !!chests[world.id];
        return (
          <section key={world.id} className={`world ${locked ? 'locked' : ''}`} style={{ background: world.background, ['--accent' as string]: world.accent }}>
            <header>
              <h2>
                {world.emoji} {world.name}
              </h2>
              <span className="world-stars">
                ⭐ {stars}/{LEVELS_PER_WORLD * 3}
              </span>
            </header>
            <div className="nodes">
              {ids.map((id, i) => {
                const entry = getLevel(id);
                const isLocked = id > unlocked;
                const isCurrent = id === current;
                const s = progress[id]?.stars ?? 0;
                const bonus = entry.kind === 'bonus';
                return (
                  <button
                    key={id}
                    ref={isCurrent ? currentRef : undefined}
                    className={`node ${bonus ? 'bonus' : ''} ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''} ${s ? 'done' : ''}`}
                    style={{ ['--offset' as string]: `${Math.sin((i / 4) * Math.PI) * 38}%` }}
                    disabled={isLocked}
                    onClick={() => go({ name: 'level', id })}
                    aria-label={`Level ${id}${bonus ? ' bonus' : ''}${isLocked ? ' locked' : ''}, ${s} stars`}
                  >
                    <span className="node-label">{isLocked ? '🔒' : bonus ? MINI_GAMES[entry.game].icon : id}</span>
                    {bonus && !isLocked && <span className="node-tag">🎁</span>}
                    {s > 0 && <span className="node-stars">{'★'.repeat(s)}</span>}
                  </button>
                );
              })}
            </div>
            <div className="chest-row">
              <button
                className={`chest ${opened ? 'opened' : complete ? 'ready' : 'closed'}`}
                disabled={opened || !complete}
                onClick={() => openChest(world.id)}
                aria-label={opened ? 'World chest opened' : complete ? 'Open the world chest' : 'World chest: finish every level to open'}
              >
                <span className="chest-icon">{opened ? '📭' : '🧰'}</span>
                <span>{opened ? 'Chest opened' : complete ? 'Open chest!' : 'Finish all levels to open'}</span>
              </button>
            </div>
          </section>
        );
      })}
      {chest && (
        <>
          <Confetti />
          <Modal onClose={() => setChest(null)}>
            <div className="chest-open">🧰</div>
            <h2>{WORLDS[chest.world - 1].name} chest!</h2>
            <div className="reward-items">
              {chest.items.map((id, i) => (
                <div key={i} className={`reward-item rarity-${POWER_UPS[id].rarity}`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <span className="icon">{POWER_UPS[id].icon}</span>
                  <span>{POWER_UPS[id].name}</span>
                </div>
              ))}
            </div>
            <p className="reward">+{chest.treats} 🍖 treats</p>
            <button className="btn primary" onClick={() => setChest(null)}>
              Woof!
            </button>
          </Modal>
        </>
      )}
      <p className="muted center">Every {BONUS_EVERY}th level is a 🎁 bonus game that earns power-ups.</p>
    </div>
  );
}
