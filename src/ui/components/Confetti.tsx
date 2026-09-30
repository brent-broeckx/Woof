import { memo, useMemo } from 'react';
import { useSave } from '../../store/saveStore';

const PIECES = ['🦴', '🐾', '⭐', '🍖', '💛'];
const COLORS = ['#ff6fa8', '#ffc933', '#7cc6fe', '#8be28b', '#c8a2ff', '#ff9a5c'];

/** Falling paper + paw confetti. Renders nothing when reduced motion is on. */
export const Confetti = memo(function Confetti({ count = 48 }: { count?: number }) {
  const reduced = useSave((s) => s.settings.reducedMotion);
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 1.8 + Math.random() * 1.6,
        rot: Math.random() * 720 - 360,
        drift: Math.random() * 80 - 40,
        emoji: i % 4 === 0 ? PIECES[i % PIECES.length] : null,
        color: COLORS[i % COLORS.length],
      })),
    [count],
  );
  if (reduced) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={b.emoji ? 'confetti-bit emoji' : 'confetti-bit'}
          style={{
            left: `${b.left}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            background: b.emoji ? undefined : b.color,
            ['--rot' as string]: `${b.rot}deg`,
            ['--drift' as string]: `${b.drift}px`,
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
});
