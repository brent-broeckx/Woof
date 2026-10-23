import { useEffect, useState } from 'react';
import { faceMood, unlockedTricks, type PupMood, type TrickId } from '../../core/pet/pup';
import { useSave } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { DogFace } from './DogFace';

interface PupAvatarProps {
  breed: string;
  mood: PupMood;
  className?: string;
  /** Tapping performs a random unlocked trick. */
  interactive?: boolean;
  /** Externally triggered trick (changes to `key` replay it). */
  trick?: { id: TrickId; key: number } | null;
}

/** The player's pup: mood face, outfit, hunger bubble and trick animations. */
export function PupAvatar({ breed, mood, className = '', interactive = false, trick = null }: PupAvatarProps) {
  const accessory = useSave((s) => s.cosmetics.accessory);
  const bondXp = useSave((s) => s.pup?.bondXp ?? 0);
  const [active, setActive] = useState<{ id: TrickId; key: number } | null>(null);

  useEffect(() => {
    if (!trick) return;
    setActive(trick);
  }, [trick]);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setActive(null), 1100);
    return () => window.clearTimeout(id);
  }, [active]);

  const pet = () => {
    const tricks = unlockedTricks(bondXp);
    const pick = tricks[Math.floor(Math.random() * tricks.length)];
    setActive({ id: pick.id, key: Date.now() });
    sfx(pick.id === 'heart' ? 'bark' : 'pop');
    haptic(15);
  };

  const hungry = mood === 'hungry' || mood === 'sad';
  const face = <DogFace breed={breed} mood={active ? 'happy' : faceMood(mood)} accessory={accessory} />;

  return (
    <div className={`pup-avatar ${className} ${active ? `trick-${active.id}` : ''}`} key={active?.key}>
      {interactive ? (
        <button className="pup-tap" onClick={pet} aria-label="Pet your pup">
          {face}
        </button>
      ) : (
        face
      )}
      {hungry && !active && (
        <span className="pup-bubble" aria-hidden="true">
          🍖?
        </span>
      )}
      {active && (
        <span className="pup-heart" aria-hidden="true">
          {active.id === 'heart' ? '💖' : '❤️'}
        </span>
      )}
    </div>
  );
}
