import { useState } from 'react';
import { STARTER_BREEDS } from '../../core/pet/breeds';
import { MAX_NAME } from '../../core/pet/pup';
import { useSave } from '../../store/saveStore';
import { sfx } from '../audio';
import { DogFace } from '../components/DogFace';

const NAME_IDEAS = ['Biscuit', 'Waffles', 'Pip', 'Mochi', 'Bean', 'Noodle', 'Pickles', 'Maple', 'Scout', 'Toffee', 'Pebble', 'Ziggy'];

/** First-run screen: choose your main pup. */
export function AdoptScreen() {
  const [breed, setBreed] = useState(STARTER_BREEDS[0].id);
  const [name, setName] = useState(() => NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)]);
  const adopt = () => {
    useSave.getState().adoptPup(name, breed);
    sfx('bark');
  };

  return (
    <div className="screen adopt-screen">
      <h1 className="logo">
        Woof<span>doku</span>
      </h1>
      <div className="card">
        <h2 className="center">Adopt your pup</h2>
        <p className="muted center">Your best buddy cheers you on, gets hungry over time and eats 🥣 kibble you earn by solving puzzles.</p>
        <div className="adopt-grid" role="radiogroup" aria-label="Breed">
          {STARTER_BREEDS.map((b) => (
            <button
              key={b.id}
              role="radio"
              aria-checked={breed === b.id}
              className={`adopt-option ${breed === b.id ? 'on' : ''}`}
              onClick={() => setBreed(b.id)}
            >
              <DogFace breed={b.id} className={breed === b.id ? 'jump' : ''} />
              <span>{b.name}</span>
            </button>
          ))}
        </div>
        <label className="adopt-name">
          Name
          <div className="row">
            <input value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} aria-label="Pup name" />
            <button className="btn small ghost" onClick={() => setName(NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)])} aria-label="Random name">
              🎲
            </button>
          </div>
        </label>
        <button className="btn primary big" disabled={!name.trim()} onClick={adopt}>
          🐾 Adopt {name.trim() || 'pup'}
        </button>
      </div>
    </div>
  );
}
