import { lazy, Suspense, useEffect } from 'react';
import { getLevel } from './core/progression/levels';
import { useNav } from './store/navStore';
import { highestUnlocked, useSave } from './store/saveStore';
import { setMusic, sfx, unlockAudio } from './ui/audio';
import { PuzzleScreen } from './ui/screens/PuzzleScreen';
import { Title } from './ui/screens/Title';
import { WorldMap } from './ui/screens/WorldMap';

const BonusScreen = lazy(() => import('./ui/screens/BonusScreen').then((m) => ({ default: m.BonusScreen })));
const HowTo = lazy(() => import('./ui/screens/HowTo').then((m) => ({ default: m.HowTo })));
const Kennel = lazy(() => import('./ui/screens/Kennel').then((m) => ({ default: m.Kennel })));
const Settings = lazy(() => import('./ui/screens/Settings').then((m) => ({ default: m.Settings })));
const DailyScreen = lazy(() => import('./ui/screens/DailyScreen').then((m) => ({ default: m.DailyScreen })));
const EndlessScreen = lazy(() => import('./ui/screens/EndlessScreen').then((m) => ({ default: m.EndlessScreen })));
const StatsScreen = lazy(() => import('./ui/screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));

const CLICKABLE = '.btn, .tool, .powerup, .node, .chip, .tab';

function Router() {
  const screen = useNav((s) => s.screen);
  switch (screen.name) {
    case 'title':
      return <Title />;
    case 'map':
      return <WorldMap />;
    case 'kennel':
      return <Kennel />;
    case 'settings':
      return <Settings />;
    case 'howto':
      return <HowTo />;
    case 'daily':
      return <DailyScreen />;
    case 'endless':
      return <EndlessScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'level': {
      if (screen.id > highestUnlocked(useSave.getState().progress)) return <WorldMap />;
      const level = getLevel(screen.id);
      return level.kind === 'bonus' ? (
        <BonusScreen key={screen.id} level={level} />
      ) : (
        <PuzzleScreen key={screen.id} levelId={level.id} puzzleIndex={level.puzzleIndex} />
      );
    }
  }
}

export function App() {
  const reducedMotion = useSave((s) => s.settings.reducedMotion);
  const music = useSave((s) => s.settings.music);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  // Browsers only allow audio after a user gesture, so music starts on the first click.
  useEffect(() => {
    if (!music) {
      setMusic(false);
      return;
    }
    setMusic(true);
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, [music]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.(CLICKABLE);
      if (el && !(el as HTMLButtonElement).disabled) sfx('click');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <Suspense fallback={<div className="screen loading">🐾 Loading…</div>}>
      <Router />
    </Suspense>
  );
}
