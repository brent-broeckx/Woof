import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { POWER_UPS, applyPowerUp, canUseMorePowerUps, type PowerUpId } from '../../core/economy/powerups';
import { computeStars, createGame, dogCount, gameReducer, MAX_POWERUPS_PER_LEVEL, type GameState } from '../../core/puzzle/game';
import { describeUnit } from '../../core/puzzle/geometry';
import { findHint } from '../../core/puzzle/hints';
import { TECHNIQUES } from '../../core/puzzle/logicSolver';
import type { Puzzle } from '../../core/puzzle/types';
import { useSave, type PuzzleOutcome } from '../../store/saveStore';
import { haptic, sfx } from '../audio';
import { Board } from './Board';
import { Confetti } from './Confetti';
import { DogFace } from './DogFace';
import { Modal, Stars, TopBar, formatTime } from './common';
import { PowerUpTray } from './PowerUpTray';
import { PupAvatar } from './PupAvatar';
import { type TrickId } from '../../core/pet/pup';
import { usePup } from '../hooks/usePup';

export interface SessionResult {
  kibble?: number;
  lines?: ReactNode[];
}

export interface PuzzleSessionProps {
  /** Stored in GameState.levelId; only real levels (>0) are autosaved. */
  sessionId: number;
  puzzle: Puzzle;
  title: ReactNode;
  subtitle: ReactNode;
  background: string;
  persist?: boolean;
  tutorial?: { id: string; title: string; lines: string[] } | null;
  resultTitle: string;
  onBack(): void;
  onStart?(): void;
  onLose?(): void;
  onWin(outcome: PuzzleOutcome): SessionResult;
  next?: { label: string; action(): void } | null;
}

export function PuzzleSession(props: PuzzleSessionProps) {
  const { sessionId, puzzle, persist = false, tutorial, onWin, onStart, onLose } = props;
  const settings = useSave((s) => s.settings);
  const inventory = useSave((s) => s.inventory);
  const accessory = useSave((s) => s.cosmetics.accessory);
  const updateSettings = useSave((s) => s.updateSettings);
  const pupView = usePup();
  const pupBreed = pupView?.pup.breed ?? 0;
  const [pupTrick, setPupTrick] = useState<{ id: TrickId; key: number } | null>(null);
  const [pupWorried, setPupWorried] = useState(false);

  const [state, dispatch] = useReducer(gameReducer, null, (): GameState => {
    const saved = persist ? useSave.getState().inProgress : null;
    return saved && saved.levelId === sessionId ? saved : createGame(sessionId, puzzle);
  });

  const [targeting, setTargeting] = useState<PowerUpId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !!tutorial && !useSave.getState().seenTips[tutorial.id]);
  const [result, setResult] = useState<(SessionResult & { stars: number }) | null>(null);
  const completedRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  useEffect(() => {
    onStart?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (state.status !== 'playing' || tutorialOpen) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') dispatch({ type: 'tick', ms: 1000 });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.status, tutorialOpen]);

  // Autosave in-progress state (only meaningful changes, not every tick).
  const saveInProgress = useSave((s) => s.saveInProgress);
  useEffect(() => {
    if (persist && state.status === 'playing') saveInProgress(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.marks, state.bones, state.powerUpsUsed, state.status]);

  // Sounds + haptics for board events.
  useEffect(() => {
    const e = state.event;
    if (!e) return;
    if (e.type === 'dog') {
      sfx('pop');
      setPupTrick({ id: 'wag', key: Date.now() });
    }
    if (e.type === 'wrong') {
      sfx('wrong');
      haptic([40, 60, 40]);
      setPupWorried(true);
      window.setTimeout(() => setPupWorried(false), 1400);
    }
    if (e.type === 'powerUp') sfx('power');
  }, [state.event]);

  useEffect(() => {
    if (state.status === 'lost') {
      sfx('bark');
      onLose?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Win handling
  useEffect(() => {
    if (state.status !== 'won' || completedRef.current) return;
    completedRef.current = true;
    const stars = computeStars(state);
    const res = onWin({ stars, timeMs: state.elapsedMs, mistakes: state.mistakes, powerUps: state.powerUpsUsed });
    setPupTrick({ id: stars === 3 ? 'dance' : 'jump', key: Date.now() });
    window.setTimeout(() => {
      sfx('win');
      haptic([30, 50, 30, 50, 80]);
      setResult({ ...res, stars });
    }, 700);
  }, [state, onWin]);

  const activatePowerUp = (id: PowerUpId, target?: number) => {
    if (inventory[id] <= 0) return;
    if (POWER_UPS[id].target && target === undefined) {
      if (!canUseMorePowerUps(state)) {
        showToast(`Max ${MAX_POWERUPS_PER_LEVEL} power-ups per level.`);
        return;
      }
      setTargeting((t) => (t === id ? null : id));
      return;
    }
    const res = applyPowerUp(state, id, { target, autoCross: settings.autoCross });
    setTargeting(null);
    if (!res.ok) {
      showToast(res.message);
      return;
    }
    useSave.getState().consumePowerUp(id);
    dispatch({ type: 'replace', state: res.state });
    if (res.state.event?.type !== 'powerUp') sfx('power');
    showToast(res.message ?? `${POWER_UPS[id].icon} ${POWER_UPS[id].name} used!`);
  };

  const nudge = () => {
    if (state.freeNudgeUsed) {
      showToast('Free nudge used — try a 🔦 Flashlight power-up.');
      return;
    }
    const hint = findHint(puzzle, state.marks);
    if (!hint) {
      showToast('No hint available.');
      return;
    }
    const next = { ...state, freeNudgeUsed: true };
    if (hint.kind === 'mistake') {
      const units = [...new Set(hint.cells.map((c) => puzzle.regions[c]))].map((index) => ({ type: 'region' as const, index }));
      dispatch({
        type: 'replace',
        state: { ...next, hint: { source: 'mistake', cells: [], units, text: `One of your crosses in ${describeUnit(units[0])} is hiding a dog!` } },
      });
      return;
    }
    const d = hint.deduction;
    dispatch({
      type: 'replace',
      state: {
        ...next,
        hint: { source: 'nudge', cells: [], units: d.focus, text: `Look closely at the highlighted area. (${TECHNIQUES[d.technique].label})` },
      },
    });
  };

  const closeTutorial = () => {
    setTutorialOpen(false);
    if (tutorial) useSave.getState().markTip(tutorial.id);
  };

  const restart = () => {
    completedRef.current = false;
    setResult(null);
    dispatch({ type: 'restart' });
    onStart?.();
  };

  const bones = useMemo(() => Array.from({ length: Math.max(3, state.bones) }, (_, i) => i < state.bones), [state.bones]);

  return (
    <div className="screen puzzle-screen" style={{ ['--world-bg' as string]: props.background }}>
      <TopBar
        onBack={props.onBack}
        title={
          <>
            <div className="level-title">{props.title}</div>
            <div className="level-sub">{props.subtitle}</div>
          </>
        }
        right={settings.showTimer ? <span className="timer">{formatTime(state.elapsedMs)}</span> : null}
      />

      <div className="puzzle-body">
        <div className="hud">
          <div className="bones" aria-label={`${state.bones} bones left`}>
            {bones.map((full, i) => (
              <span key={i} className={full ? 'bone' : 'bone lost'}>
                🦴
              </span>
            ))}
          </div>
          {pupView && (
            <PupAvatar breed={pupView.pup.breed} mood={pupWorried || state.status === 'lost' ? 'sad' : pupView.mood} trick={pupTrick} className="hud-pup" />
          )}
          <div className="dogs-count">
            🐶 {dogCount(state)}/{puzzle.size}
          </div>
        </div>

        {targeting && (
          <div className="target-banner">
            {POWER_UPS[targeting].icon} {POWER_UPS[targeting].targetPrompt}
            <button className="link" onClick={() => setTargeting(null)}>
              Cancel
            </button>
          </div>
        )}

        <div className="board-wrap">
          <Board state={state} dispatch={dispatch} settings={settings} onTarget={targeting ? (cell) => activatePowerUp(targeting, cell) : null} />
        </div>

        {state.hint && (
          <div className={`hint-box ${state.hint.source}`}>
            <span>{state.hint.text}</span>
            <button className="link" onClick={() => dispatch({ type: 'setHint', hint: null })}>
              OK
            </button>
          </div>
        )}

        <div className="tools">
          <button className="tool" onClick={() => dispatch({ type: 'undo' })} disabled={!state.history.length}>
            ↶<span>Undo</span>
          </button>
          <button className="tool" onClick={nudge} disabled={state.status !== 'playing'}>
            💡<span>{state.freeNudgeUsed ? 'Used' : 'Nudge'}</span>
          </button>
          <button
            className={`tool mode ${settings.placementMode}`}
            onClick={() => updateSettings({ placementMode: settings.placementMode === 'x' ? 'dog' : 'x' })}
            title="Switch what a single tap does"
          >
            {settings.placementMode === 'x' ? '✕' : '🐶'}
            <span>Tap: {settings.placementMode === 'x' ? 'Cross' : 'Dog'}</span>
          </button>
          <button className="tool" onClick={restart}>
            ⟲<span>Restart</span>
          </button>
        </div>

        <div className="tray-wrap">
          <PowerUpTray inventory={inventory} active={targeting} disabled={state.status !== 'playing'} onUse={(id) => activatePowerUp(id)} />
          <div className="powerup-note">
            Power-ups used: {state.powerUpsUsed}/{MAX_POWERUPS_PER_LEVEL} · 3★ needs no mistakes & no power-ups
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {tutorialOpen && tutorial && (
        <Modal onClose={closeTutorial}>
          <div className="modal-dog">
            <DogFace breed={pupBreed} accessory={accessory} />
          </div>
          <h2>{tutorial.title}</h2>
          {tutorial.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <button className="btn primary" onClick={closeTutorial}>
            Let's go!
          </button>
        </Modal>
      )}

      {state.status === 'lost' && (
        <Modal>
          <div className="modal-dog">
            <DogFace breed={pupBreed} mood="sad" accessory={accessory} />
          </div>
          <h2>Out of bones!</h2>
          <p>Every dog needs the right home. Want to keep going?</p>
          <div className="modal-actions column">
            {inventory.extraBone > 0 && canUseMorePowerUps(state) && (
              <button className="btn primary" onClick={() => activatePowerUp('extraBone')}>
                🦴 Use Extra Bone ({inventory.extraBone})
              </button>
            )}
            <button className="btn" onClick={restart}>
              ⟲ Try again
            </button>
            <button className="btn ghost" onClick={props.onBack}>
              Back
            </button>
          </div>
        </Modal>
      )}

      {result && (
        <>
          <Confetti count={result.stars === 3 ? 70 : 40} />
          <Modal>
            <div className="celebrate">
              {Array.from({ length: Math.min(puzzle.size, 5) }, (_, i) => (
                <DogFace key={i} breed={i === 2 ? pupBreed : i} className="jump" accessory={i === 2 ? accessory : 'none'} />
              ))}
            </div>
            <h2>{props.resultTitle}</h2>
            <Stars count={result.stars} animate />
            <p className="result-line">
              ⏱ {formatTime(state.elapsedMs)} · ❌ {state.mistakes} mistake{state.mistakes === 1 ? '' : 's'} · ⚡ {state.powerUpsUsed} power-up
              {state.powerUpsUsed === 1 ? '' : 's'}
            </p>
            {!!result.kibble && <p className="reward">+{result.kibble} 🥣 kibble</p>}
            {result.lines?.map((line, i) => (
              <p key={i} className="reward">
                {line}
              </p>
            ))}
            <div className="modal-actions">
              <button className="btn" onClick={props.onBack}>
                Back
              </button>
              {result.stars < 3 && (
                <button className="btn" onClick={restart}>
                  Replay
                </button>
              )}
              {props.next && (
                <button className="btn primary" onClick={props.next.action}>
                  {props.next.label}
                </button>
              )}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
