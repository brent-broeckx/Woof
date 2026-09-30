import { useEffect, useRef } from 'react';
import { MINI_GAMES } from '../../minigames/registry';
import { BONUS_EVERY, LEVELS_PER_WORLD, WORLDS, getLevel } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { highestUnlocked, useSave } from '../../store/saveStore';
import { TopBar } from '../components/common';

export function WorldMap() {
  const go = useNav((s) => s.go);
  const progress = useSave((s) => s.progress);
  const treats = useSave((s) => s.treats);
  const unlocked = highestUnlocked(progress);
  const currentRef = useRef<HTMLButtonElement>(null);

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
                const isCurrent = id === unlocked;
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
          </section>
        );
      })}
      <p className="muted center">Every {BONUS_EVERY}th level is a 🎁 bonus game that earns power-ups.</p>
    </div>
  );
}
