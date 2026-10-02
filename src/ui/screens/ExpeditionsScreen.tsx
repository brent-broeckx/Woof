import { useState } from 'react';
import { breedById } from '../../core/pet/breeds';
import { POWER_UPS } from '../../core/economy/powerups';
import {
  awayDogs,
  DESTINATIONS,
  destinationById,
  destinationUnlocked,
  DURATIONS,
  MAX_TEAM,
  MAX_TRIPS,
  postcardById,
  SET_REWARD,
  tripReady,
  tripTreats,
  type Expedition,
} from '../../core/pet/expeditions';
import { dogRate } from '../../core/pet/yard';
import { LEVELS_PER_WORLD } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { dogName, highestUnlocked, useSave, type ExpeditionClaim } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { Modal, TopBar } from '../components/common';
import { DogFace } from '../components/DogFace';
import { useNow } from '../hooks/usePup';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function formatLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function ExpeditionsScreen() {
  const go = useNav((s) => s.go);
  const treats = useSave((s) => s.treats);
  const pup = useSave((s) => s.pup);
  const pack = useSave((s) => s.pack);
  const progress = useSave((s) => s.progress);
  const expeditions = useSave((s) => s.expeditions);
  const now = useNow(1000);
  const [dest, setDest] = useState(DESTINATIONS[0].id);
  const [hours, setHours] = useState<number>(DURATIONS[1].hours);
  const [team, setTeam] = useState<string[]>([]);
  const [claim, setClaim] = useState<{ trip: Expedition; result: ExpeditionClaim } | null>(null);
  const [recalling, setRecalling] = useState<Expedition | null>(null);
  if (!pup) return null;

  const highest = highestUnlocked(progress);
  const away = awayDogs(expeditions);
  const available = pack.filter((d) => d.breed !== pup.breed && !away.has(d.breed));
  const picked = team.filter((b) => available.some((d) => d.breed === b));
  const teamProducers = picked.map((b) => ({ breed: b, level: pack.find((d) => d.breed === b)?.level ?? 1 }));
  const destination = destinationById(dest) ?? DESTINATIONS[0];
  const duration = DURATIONS.find((d) => d.hours === hours) ?? DURATIONS[0];
  const slotsFull = expeditions.trips.length >= MAX_TRIPS;
  const homeRate = teamProducers.reduce((s, p) => s + dogRate(p), 0);

  const toggle = (breed: string) => {
    sfx('click');
    setTeam((t) => (t.includes(breed) ? t.filter((b) => b !== breed) : t.length >= MAX_TEAM ? t : [...t, breed]));
  };

  const send = () => {
    if (!useSave.getState().sendExpedition(destination.id, hours, picked)) return;
    sfx('bark');
    haptic([20, 30, 20]);
    setTeam([]);
  };

  const open = (trip: Expedition) => {
    const result = useSave.getState().claimExpedition(trip.id);
    if (!result) return;
    sfx(result.completedSet ? 'win' : 'reward');
    haptic([20, 30, 20]);
    setClaim({ trip, result });
  };

  return (
    <div className="screen expeditions-screen">
      <TopBar onBack={() => go({ name: 'yard' })} title="🧭 Expeditions" right={<span className="chip">🍖 {treats}</span>} />

      <button className="btn" onClick={() => go({ name: 'album' })}>
        📮 Postcard album <span className="muted">({Object.keys(expeditions.album).length})</span>
      </button>

      {expeditions.trips.map((trip) => {
        const d = destinationById(trip.destination)!;
        const ready = tripReady(trip, now);
        const pct = Math.min(100, Math.max(0, ((now - trip.startedAt) / Math.max(1, trip.endsAt - trip.startedAt)) * 100));
        return (
          <div key={trip.id} className={`card trip-card ${ready ? 'ready' : ''}`}>
            <div className="trip-head">
              <span className="trip-emoji" aria-hidden>
                {d.emoji}
              </span>
              <div>
                <h3>{d.name}</h3>
                <p className="muted text-small">
                  {trip.dogs.map((b) => dogName({ pup }, { breed: b, name: pack.find((p) => p.breed === b)?.name ?? '' })).join(', ')}
                </p>
              </div>
              <div className="trip-dogs" aria-hidden>
                {trip.dogs.map((b) => (
                  <DogFace key={b} breed={b} mood={ready ? 'happy' : 'calm'} />
                ))}
              </div>
            </div>
            <div className="fullness good" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <div style={{ width: `${pct}%` }} />
            </div>
            {ready ? (
              <button className="btn primary" onClick={() => open(trip)}>
                🎒 They're back! Open loot
              </button>
            ) : (
              <div className="pup-stat-row">
                <span className="muted text-small">Back in {formatLeft(trip.endsAt - now)}</span>
                <button className="btn small ghost" onClick={() => setRecalling(trip)}>
                  Call back
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="card">
        <h3>New expedition</h3>
        {slotsFull ? (
          <p className="muted">All {MAX_TRIPS} trips are out. Wait for a team to come home.</p>
        ) : available.length === 0 && away.size > 0 ? (
          <p className="muted">Everyone's out exploring. {pup.name} is keeping the yard safe until they're back.</p>
        ) : available.length === 0 ? (
          <p className="muted">
            {pup.name} stays home to guard the yard. Rescue story dogs from world chests or adopt at the Adoption Fair to send them exploring.
          </p>
        ) : (
          <>
            <p className="muted text-small">Where to?</p>
            <div className="dest-grid">
              {DESTINATIONS.map((d) => {
                const unlocked = destinationUnlocked(d, highest, LEVELS_PER_WORLD);
                return (
                  <button
                    key={d.id}
                    className={`dest-btn ${dest === d.id ? 'selected' : ''}`}
                    disabled={!unlocked}
                    aria-pressed={dest === d.id}
                    onClick={() => setDest(d.id)}
                  >
                    <span aria-hidden>{unlocked ? d.emoji : '🔒'}</span>
                    {d.name}
                    {!unlocked && <small>World {d.world}</small>}
                  </button>
                );
              })}
            </div>
            <p className="muted text-small">How long?</p>
            <div className="row">
              {DURATIONS.map((d) => (
                <button
                  key={d.hours}
                  className={`btn small ${hours === d.hours ? 'primary' : ''}`}
                  aria-pressed={hours === d.hours}
                  onClick={() => setHours(d.hours)}
                >
                  {d.hours}h
                </button>
              ))}
            </div>
            <p className="muted text-small">
              Pick up to {MAX_TEAM} dogs ({picked.length}/{MAX_TEAM})
            </p>
            <div className="team-grid">
              {available.map((d) => {
                const on = picked.includes(d.breed);
                return (
                  <button
                    key={d.breed}
                    className={`team-dog r-border-${breedById(d.breed).rarity} ${on ? 'selected' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggle(d.breed)}
                  >
                    <DogFace breed={d.breed} mood={on ? 'happy' : 'calm'} />
                    <span>{dogName({ pup }, d)}</span>
                    <small className="muted">Lv {d.level}</small>
                  </button>
                );
              })}
            </div>
            {picked.length > 0 && (
              <p className="text-small">
                Brings back <b>{tripTreats(teamProducers, destination, hours)} 🍖</b>
                {duration.postcard >= 1 ? ' + a postcard' : ` · ${Math.round(duration.postcard * 100)}% postcard`} · {Math.round(duration.item * 100)}% power-up
                {duration.kibble > 0 ? ` · ${Math.round(duration.kibble * 100)}% kibble` : ''}.{' '}
                <span className="muted">The yard makes {fmt(homeRate)} 🍖/h less while they're away.</span>
              </p>
            )}
            <button className="btn primary big" disabled={picked.length === 0} onClick={send}>
              Send {picked.length || ''} to {destination.name} · {hours}h
            </button>
          </>
        )}
      </div>

      {recalling && (
        <Modal onClose={() => setRecalling(null)}>
          <h2>Call the team back?</h2>
          <p>They'll come home right away, but bring nothing with them.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setRecalling(null)}>
              Keep exploring
            </button>
            <button
              className="btn primary"
              onClick={() => {
                useSave.getState().recallExpedition(recalling.id);
                setRecalling(null);
              }}
            >
              Call back
            </button>
          </div>
        </Modal>
      )}

      {claim && (
        <Modal onClose={() => setClaim(null)}>
          {claim.result.completedSet && <Confetti />}
          <h2>Back from {destinationById(claim.trip.destination)?.name}!</h2>
          <div className="loot-list">
            <p className="reward">+{claim.result.loot.treats} 🍖</p>
            {claim.result.loot.kibble > 0 && <p className="reward">+{claim.result.loot.kibble} 🥣</p>}
            {claim.result.loot.items.map((id, i) => (
              <p key={i} className="reward">
                {POWER_UPS[id].icon} {POWER_UPS[id].name}
              </p>
            ))}
          </div>
          {claim.result.loot.postcard && <PostcardView id={claim.result.loot.postcard} />}
          {claim.result.loot.postcard && (
            <p className="muted text-small">
              {claim.result.newPostcard ? 'New postcard for your album!' : `Already in your album · +${claim.result.duplicateTreats} 🍖`}
            </p>
          )}
          {claim.result.completedSet && (
            <p className="reward">
              Set complete! +{SET_REWARD.treats} 🍖 +{SET_REWARD.kibble} 🥣
            </p>
          )}
          <button className="btn primary" onClick={() => setClaim(null)}>
            Nice!
          </button>
        </Modal>
      )}
    </div>
  );
}

export function PostcardView({ id, missing = false }: { id: string; missing?: boolean }) {
  const card = postcardById(id);
  if (!card) return null;
  const dest = destinationById(id.split('.')[0]);
  return (
    <div className={`postcard ${missing ? 'missing' : ''}`} style={{ ['--pc-hue' as string]: (DESTINATIONS.indexOf(dest!) * 70) % 360 }}>
      <span className="postcard-art" aria-hidden>
        {missing ? '?' : card.emoji}
      </span>
      <span className="postcard-title">{missing ? '???' : card.title}</span>
      <span className="postcard-stamp" aria-hidden>
        {dest?.emoji}
      </span>
    </div>
  );
}

export function AlbumScreen() {
  const go = useNav((s) => s.go);
  const album = useSave((s) => s.expeditions.album);
  const sets = useSave((s) => s.expeditions.sets);
  const total = DESTINATIONS.reduce((s, d) => s + d.postcards.length, 0);
  const owned = Object.keys(album).length;

  return (
    <div className="screen album-screen">
      <TopBar
        onBack={() => go({ name: 'expeditions' })}
        title="📮 Postcards"
        right={
          <span className="chip">
            {owned}/{total}
          </span>
        }
      />
      <p className="muted center">
        Expeditions bring back postcards. Finish a destination's set for +{SET_REWARD.treats} 🍖 and +{SET_REWARD.kibble} 🥣.
      </p>
      {DESTINATIONS.map((d) => {
        const have = d.postcards.filter((p) => album[p.id]).length;
        return (
          <div key={d.id} className="card">
            <div className="pup-stat-row">
              <h3>
                {d.emoji} {d.name}
              </h3>
              <span className={sets[d.id] ? 'good-text' : 'muted'}>{sets[d.id] ? '✓ Complete' : `${have}/${d.postcards.length}`}</span>
            </div>
            <div className="postcard-grid">
              {d.postcards.map((p) => (
                <PostcardView key={p.id} id={p.id} missing={!album[p.id]} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
