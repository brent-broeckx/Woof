import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { POWER_UPS, applyPowerUp, canUseMorePowerUps, type PowerUpId } from '../../core/economy/powerups';
import { getLevel, TOTAL_LEVELS, WORLDS } from '../../core/progression/levels';
import { computeStars, createGame, dogCount, gameReducer, MAX_POWERUPS_PER_LEVEL, type GameState } from '../../core/puzzle/game';
import { describeUnit } from '../../core/puzzle/geometry';
import { findHint } from '../../core/puzzle/hints';
import { TECHNIQUES } from '../../core/puzzle/logicSolver';
import { PUZZLES } from '../../data/puzzles';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { Board } from '../components/Board';
import { DogFace } from '../components/DogFace';
import { Modal, Stars, TopBar, formatTime } from '../components/common';
import { PowerUpTray } from '../components/PowerUpTray';

const TUTORIAL: Record<number, string[]> = {
  1: [
    'Put one 🐶 in every row, every column and every coloured yard.',
    'Double-tap (or long-press / right-click) a tile to place a dog. Tap once to cross a tile off with ✕.',
    'Tip: a yard with only one tile must hold its dog!',
  ],
  2: ['Dogs need personal space: two dogs may never touch — not even diagonally.', 'After placing a dog, the tiles it blocks are marked with • automatically.'],
  3: ['Drag across tiles to cross off many at once.', 'Stuck? Tap 💡 for a free nudge each level.'],
};

export function PuzzleScreen({ levelId, puzzleIndex }: { levelId: number; puzzleIndex: number }) {
  const go = useNav((s) => s.go);
  const settings = useSave((s) => s.settings);
  const inventory = useSave((s) => s.inventory);
  const updateSettings = useSave((s) => s.updateSettings);
  const puzzle = PUZZLES[puzzleIndex];

  const [state, dispatch] = useReducer(gameReducer, null, (): GameState => {
    const saved = useSave.getState().inProgress;
    return saved && saved.levelId === levelId ? saved : createGame(levelId, puzzle);
  });

  const [targeting, setTargeting] = useState<PowerUpId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => !!TUTORIAL[levelId] && !useSave.getState().seenTips[`level-${levelId}`]);
  const [result, setResult] = useState<{ stars: number; treats: number; best: boolean } | null>(null);
  const completedRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
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
    if (state.status === 'playing') saveInProgress(state);
  }, [state.marks, state.bones, state.powerUpsUsed, state.status, state.shield]);

  // Win handling
  useEffect(() => {
    if (state.status !== 'won' || completedRef.current) return;
    completedRef.current = true;
    const stars = computeStars(state);
    const { treats, improved } = useSave.getState().completePuzzle(levelId, stars, state.elapsedMs);
    window.setTimeout(() => setResult({ stars, treats, best: improved }), 700);
  }, [state, levelId]);

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
      dispatch({ type: 'replace', state: { ...next, hint: { source: 'mistake', cells: [], units, text: `One of your crosses in ${describeUnit(units[0])} is hiding a dog!` } } });
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
    useSave.getState().markTip(`level-${levelId}`);
  };

  const world = WORLDS[getLevel(levelId).world - 1];
  const nextLevel = levelId < TOTAL_LEVELS ? levelId + 1 : null;
  const bones = useMemo(() => Array.from({ length: Math.max(3, state.bones) }, (_, i) => i < state.bones), [state.bones]);

  return (
    <div className="screen puzzle-screen" style={{ ['--world-bg' as string]: world.background }}>
      <TopBar
        onBack={() => go({ name: 'map' })}
        title={
          <>
            <div className="level-title">Level {levelId}</div>
            <div className="level-sub">
              {world.emoji} {world.name} · {puzzle.size}×{puzzle.size}
            </div>
          </>
        }
        right={settings.showTimer ? <span className="timer">{formatTime(state.elapsedMs)}</span> : null}
      />

      <div className="hud">
        <div className="bones" aria-label={`${state.bones} bones left`}>
          {bones.map((full, i) => (
            <span key={i} className={full ? 'bone' : 'bone lost'}>
              🦴
            </span>
          ))}
          {state.shield && <span className="shield-badge" title="Bone Shield active">🛡️</span>}
        </div>
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
        <button className="tool" onClick={() => dispatch({ type: 'restart' })}>
          ⟲<span>Restart</span>
        </button>
      </div>

      <PowerUpTray inventory={inventory} active={targeting} disabled={state.status !== 'playing'} onUse={(id) => activatePowerUp(id)} />
      <div className="powerup-note">
        Power-ups used: {state.powerUpsUsed}/{MAX_POWERUPS_PER_LEVEL} · 3★ needs no mistakes & no power-ups
      </div>

      {toast && <div className="toast">{toast}</div>}

      {tutorialOpen && (
        <Modal onClose={closeTutorial}>
          <div className="modal-dog">
            <DogFace breed={0} />
          </div>
          <h2>{levelId === 1 ? 'Welcome to Woofdoku!' : 'New trick!'}</h2>
          {TUTORIAL[levelId].map((line) => (
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
            <DogFace breed={2} mood="sad" />
          </div>
          <h2>Out of bones!</h2>
          <p>Every dog needs the right home. Want to keep going?</p>
          <div className="modal-actions column">
            {inventory.extraBone > 0 && canUseMorePowerUps(state) && (
              <button className="btn primary" onClick={() => activatePowerUp('extraBone')}>
                🦴 Use Extra Bone ({inventory.extraBone})
              </button>
            )}
            {inventory.rewind > 0 && canUseMorePowerUps(state) && (
              <button className="btn primary" onClick={() => activatePowerUp('rewind')}>
                ⏪ Use Rewind ({inventory.rewind})
              </button>
            )}
            <button className="btn" onClick={() => dispatch({ type: 'restart' })}>
              ⟲ Try again
            </button>
            <button className="btn ghost" onClick={() => go({ name: 'map' })}>
              Back to map
            </button>
          </div>
        </Modal>
      )}

      {result && (
        <Modal>
          <div className="celebrate">
            {Array.from({ length: Math.min(puzzle.size, 5) }, (_, i) => (
              <DogFace key={i} breed={i} className="jump" />
            ))}
          </div>
          <h2>Level {levelId} complete!</h2>
          <Stars count={result.stars} animate />
          <p className="result-line">
            ⏱ {formatTime(state.elapsedMs)} · ❌ {state.mistakes} mistake{state.mistakes === 1 ? '' : 's'} · ⚡ {state.powerUpsUsed} power-up{state.powerUpsUsed === 1 ? '' : 's'}
          </p>
          {result.treats > 0 && <p className="reward">+{result.treats} 🍖 treats</p>}
          <div className="modal-actions">
            <button className="btn" onClick={() => go({ name: 'map' })}>
              Map
            </button>
            {result.stars < 3 && (
              <button
                className="btn"
                onClick={() => {
                  completedRef.current = false;
                  setResult(null);
                  dispatch({ type: 'restart' });
                }}
              >
                Replay
              </button>
            )}
            {nextLevel && (
              <button className="btn primary" onClick={() => go({ name: 'level', id: nextLevel })}>
                Next →
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
