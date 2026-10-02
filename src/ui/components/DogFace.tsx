import { memo } from 'react';
import type { AccessoryId } from '../../core/economy/cosmetics';
import { BOARD_BREED_COUNT, BREED_CATALOG, breedById, type BreedLook } from '../../core/pet/breeds';

/** Board breeds are addressed by colour index; collection dogs by breed id. */
const lookFor = (breed: number | string): BreedLook => (typeof breed === 'string' ? breedById(breed).look : BREED_CATALOG[breed % BOARD_BREED_COUNT].look);

interface DogFaceProps {
  breed: number | string;
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
    case 'medal':
      return (
        <g>
          <path d="M38 78 L46 94 M62 78 L54 94" stroke="#3d6fd8" strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="94" r="7" fill="#ffc933" stroke="#c9901a" strokeWidth="2" />
          <path d="M50 90 L51.4 93 L54.6 93.2 L52.1 95.2 L53 98.3 L50 96.5 L47 98.3 L47.9 95.2 L45.4 93.2 L48.6 93 Z" fill="#fff4c2" />
        </g>
      );
    case 'laurel':
      return (
        <g fill="#5fa14a" stroke="#3e7a2f" strokeWidth="1">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse cx={30 + i * 4} cy={26 - i * 3.2} rx="5" ry="2.6" transform={`rotate(${-40 + i * 10} ${30 + i * 4} ${26 - i * 3.2})`} />
              <ellipse cx={70 - i * 4} cy={26 - i * 3.2} rx="5" ry="2.6" transform={`rotate(${40 - i * 10} ${70 - i * 4} ${26 - i * 3.2})`} />
            </g>
          ))}
        </g>
      );
    case 'cape':
      return (
        <g>
          <path d="M24 78 Q50 90 76 78 L84 100 L16 100 Z" fill="#e53950" stroke="#a51f34" strokeWidth="1.5" />
          <circle cx="50" cy="86" r="5" fill="#ffc933" stroke="#c9901a" strokeWidth="1.5" />
        </g>
      );
    case 'catEars':
      return (
        <g stroke="#2d2320" strokeWidth="2" strokeLinejoin="round">
          <path d="M30 30 L34 6 L48 24 Z" fill="#9a9a9a" />
          <path d="M70 30 L66 6 L52 24 Z" fill="#9a9a9a" />
          <path d="M34 25 L36 13 L43 22 Z" fill="#f7a8c4" stroke="none" />
          <path d="M66 25 L64 13 L57 22 Z" fill="#f7a8c4" stroke="none" />
        </g>
      );
    default:
      return null;
  }
}

export const DogFace = memo(function DogFace({ breed, mood = 'happy', className, accessory = 'none' }: DogFaceProps) {
  const b = lookFor(breed);
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
      {b.sparkle && (
        <g fill="#fff" className="dog-sparkle">
          <path d="M16 20 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" />
          <path d="M84 70 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" />
        </g>
      )}
      {accessory !== 'none' && <Accessory id={accessory} />}
    </svg>
  );
});
