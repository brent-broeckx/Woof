import { useMemo, useRef, useState } from 'react';
import { DogFace } from '../../ui/components/DogFace';
import type { MiniGameProps } from '../registry';
import { isSolvedTiles, optimalMoves, scramble, slide, slidingConfigForTier, slidingStars } from './logic';

export default function SlidingPupView({ tier, seed, onFinish }: MiniGameProps) {
  const { size, scrambleMoves } = slidingConfigForTier(tier);
  const start = useMemo(() => {
    const { tiles, walk } = scramble(size, scrambleMoves, seed);
    const target = optimalMoves(tiles, size) ?? walk;
    return { tiles, target };
  }, [size, scrambleMoves, seed]);
  const [tiles, setTiles] = useState(start.tiles);
  const [moves, setMoves] = useState(0);
  const [showNumbers, setShowNumbers] = useState(true);
  const finished = useRef(false);
  const solved = isSolvedTiles(tiles);
  const breed = seed % 11;

  const tap = (index: number) => {
    if (finished.current) return;
    const next = slide(tiles, size, index);
    if (!next) return;
    const m = moves + 1;
    setTiles(next);
    setMoves(m);
    if (isSolvedTiles(next)) {
      finished.current = true;
      const stars = slidingStars(m, start.target);
      window.setTimeout(() => onFinish({ stars, summary: `${m} moves (best possible ${start.target})` }), 900);
    }
  };

  const giveUp = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ stars: 0, summary: 'Puzzle not finished' });
  };

  return (
    <div className="minigame sliding-game">
      <div className="mg-stats">
        <span>👣 {moves} moves</span>
        <span>🎯 target {start.target}</span>
      </div>
      <div className="slide-row">
        <div className="slide-board" style={{ ['--n' as string]: size }}>
          {tiles.map((t, i) => {
            if (t === 0 && !solved) return <div key={`gap-${i}`} className="slide-gap" style={{ gridRow: Math.floor(i / size) + 1, gridColumn: (i % size) + 1 }} />;
            const home = t === 0 ? size * size - 1 : t - 1;
            const hr = Math.floor(home / size);
            const hc = home % size;
            return (
              <button
                key={t}
                className={`slide-tile ${home === i ? 'home' : ''}`}
                style={{ gridRow: Math.floor(i / size) + 1, gridColumn: (i % size) + 1 }}
                onClick={() => tap(i)}
                aria-label={`Tile ${t}`}
              >
                <div
                  className="slide-img"
                  style={{
                    width: `${size * 100}%`,
                    height: `${size * 100}%`,
                    left: `${-hc * 100}%`,
                    top: `${-hr * 100}%`,
                  }}
                >
                  <DogFace breed={breed} />
                </div>
                {showNumbers && !solved && <span className="slide-num">{t}</span>}
              </button>
            );
          })}
        </div>
        <div className="slide-preview" aria-label="Goal picture">
          <DogFace breed={breed} />
          <small>Goal</small>
        </div>
      </div>
      <div className="mg-actions">
        <button className="btn" onClick={() => setShowNumbers((s) => !s)}>
          {showNumbers ? 'Hide numbers' : 'Show numbers'}
        </button>
        <button className="btn ghost" onClick={giveUp}>
          Give up
        </button>
      </div>
    </div>
  );
}
