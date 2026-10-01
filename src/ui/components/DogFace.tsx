import { memo } from 'react';
import type { AccessoryId } from '../../core/economy/cosmetics';

export interface Breed {
  name: string;
  fur: string;
  ear: string;
  muzzle: string;
  ears: 'pointy' | 'floppy' | 'round';
  patch?: string;
  spots?: boolean;
  /** Pale cheek/eyebrow markings (e.g. Shiba urajiro). */
  cheeks?: string;
}

/** One breed per yard colour (same order as REGION_COLORS). */
export const BREEDS: Breed[] = [
  { name: 'Corgi', fur: '#f2a65a', ear: '#e08a3c', muzzle: '#fff4e6', ears: 'pointy' },
  { name: 'Husky', fur: '#8e9aab', ear: '#6b7688', muzzle: '#ffffff', ears: 'pointy', patch: '#ffffff' },
  { name: 'Dachshund', fur: '#a0643b', ear: '#7a4726', muzzle: '#c98b5e', ears: 'floppy' },
  { name: 'Poodle', fur: '#f4efe6', ear: '#e6dccb', muzzle: '#fbf8f2', ears: 'round' },
  { name: 'Shiba', fur: '#d2602a', ear: '#a9441a', muzzle: '#fff4e4', ears: 'pointy', cheeks: '#fff4e4' },
  { name: 'Beagle', fur: '#f0dcc0', ear: '#9a5b2e', muzzle: '#ffffff', ears: 'floppy', patch: '#c7813f' },
  { name: 'Pug', fur: '#e8cfa3', ear: '#4a3b30', muzzle: '#5a483b', ears: 'floppy' },
  { name: 'Dalmatian', fur: '#ffffff', ear: '#3a3a3a', muzzle: '#ffffff', ears: 'floppy', spots: true },
  { name: 'Golden', fur: '#f1c46b', ear: '#d9a444', muzzle: '#f7dca3', ears: 'floppy' },
  { name: 'Frenchie', fur: '#c9c1b6', ear: '#a79c8e', muzzle: '#e9e3da', ears: 'round', patch: '#6e645a' },
  { name: 'Collie', fur: '#3d3431', ear: '#2a2321', muzzle: '#ffffff', ears: 'pointy', patch: '#ffffff' },
];

export const breedFor = (index: number) => BREEDS[index % BREEDS.length];

interface DogFaceProps {
  breed: number;
  mood?: 'happy' | 'sad' | 'calm';
  className?: string;
  accessory?: AccessoryId;
}

function Accessory({ id }: { id: AccessoryId }) {
  switch (id) {
    case 'bandana':
      return (
        <g>
          <path d="M26 80 Q50 96 74 80 L50 99 Z" fill="#e53950" />
          <circle cx="44" cy="88" r="1.6" fill="#fff" />
          <circle cx="54" cy="90" r="1.6" fill="#fff" />
        </g>
      );
    case 'bow':
      return (
        <g fill="#ff6fa8" stroke="#c2407a" strokeWidth="1.5">
          <path d="M50 24 L34 14 L34 34 Z" />
          <path d="M50 24 L66 14 L66 34 Z" />
          <circle cx="50" cy="24" r="4.5" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(72 28)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={Math.sin((a * Math.PI) / 180) * 6} r="5" fill="#ffd6e8" stroke="#f28bb5" />
          ))}
          <circle r="4" fill="#ffd23f" />
        </g>
      );
    case 'glasses':
      return (
        <g fill="rgba(120,200,255,0.25)" stroke="#1d1d1d" strokeWidth="3">
          <circle cx="38" cy="51" r="9" />
          <circle cx="62" cy="51" r="9" />
          <path d="M47 50 L53 50" fill="none" />
        </g>
      );
    case 'partyHat':
      return (
        <g>
          <path d="M36 30 L50 0 L64 30 Z" fill="#7c5cff" />
          <path d="M40 22 L60 22 M44 13 L56 13" stroke="#ffd23f" strokeWidth="3" />
          <circle cx="50" cy="2" r="4" fill="#ff6fa8" />
        </g>
      );
    case 'tophat':
      return (
        <g fill="#222">
          <rect x="30" y="24" width="40" height="6" rx="2" />
          <rect x="37" y="2" width="26" height="24" rx="2" />
          <rect x="37" y="18" width="26" height="5" fill="#e53950" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M32 30 L32 12 L41 21 L50 6 L59 21 L68 12 L68 30 Z" fill="#ffc933" stroke="#c9901a" strokeWidth="2" />
          <circle cx="50" cy="22" r="3" fill="#e53950" />
        </g>
      );
    default:
      return null;
  }
}

export const DogFace = memo(function DogFace({ breed, mood = 'happy', className, accessory = 'none' }: DogFaceProps) {
  const b = breedFor(breed);
  const dark = '#2d2320';
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {b.ears === 'pointy' && (
        <g fill={b.ear}>
          <path d="M20 46 L26 8 L48 30 Z" />
          <path d="M80 46 L74 8 L52 30 Z" />
          <path d="M27 36 L29 18 L40 30 Z" fill="#f7c1c1" opacity="0.8" />
          <path d="M73 36 L71 18 L60 30 Z" fill="#f7c1c1" opacity="0.8" />
        </g>
      )}
      {b.ears === 'round' && (
        <g fill={b.ear}>
          <circle cx="24" cy="30" r="15" />
          <circle cx="76" cy="30" r="15" />
        </g>
      )}
      <ellipse cx="50" cy="56" rx="33" ry="31" fill={b.fur} />
      {b.patch && <ellipse cx="50" cy="66" rx="20" ry="22" fill={b.patch} opacity="0.95" />}
      {b.spots && (
        <g fill={dark}>
          <circle cx="30" cy="44" r="4" />
          <circle cx="70" cy="40" r="3" />
          <circle cx="66" cy="74" r="3.5" />
          <circle cx="28" cy="68" r="2.5" />
        </g>
      )}
      {b.cheeks && (
        <g fill={b.cheeks}>
          <ellipse cx="27" cy="66" rx="10" ry="9" />
          <ellipse cx="73" cy="66" rx="10" ry="9" />
          <ellipse cx="38" cy="42" rx="4.5" ry="2.6" />
          <ellipse cx="62" cy="42" rx="4.5" ry="2.6" />
        </g>
      )}
      {b.ears === 'floppy' && (
        <g fill={b.ear}>
          <ellipse cx="18" cy="52" rx="11" ry="22" transform="rotate(14 18 52)" />
          <ellipse cx="82" cy="52" rx="11" ry="22" transform="rotate(-14 82 52)" />
        </g>
      )}
      <ellipse cx="50" cy="71" rx="17" ry="13" fill={b.muzzle} />
      {mood === 'sad' ? (
        <g stroke={dark} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M33 52 Q38 48 43 52" />
          <path d="M57 52 Q62 48 67 52" />
        </g>
      ) : (
        <g fill={dark}>
          <circle cx="38" cy="51" r="4.6" />
          <circle cx="62" cy="51" r="4.6" />
          <circle cx="39.5" cy="49.5" r="1.4" fill="#fff" />
          <circle cx="63.5" cy="49.5" r="1.4" fill="#fff" />
        </g>
      )}
      <ellipse cx="50" cy="64" rx="6.5" ry="4.8" fill={dark} />
      {mood === 'happy' && <path d="M45 74 Q50 84 55 74 Z" fill="#f28b9b" />}
      <path d={mood === 'sad' ? 'M43 78 Q50 73 57 78' : 'M42 71 Q46 75 50 71 Q54 75 58 71'} stroke={dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {accessory !== 'none' && <Accessory id={accessory} />}
    </svg>
  );
});
