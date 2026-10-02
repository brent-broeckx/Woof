import { lazy, Suspense, useEffect } from 'react';
import { getLevel } from './core/progression/levels';
import { useNav } from './store/navStore';
import { highestUnlocked, useSave } from './store/saveStore';
import { GREETING_AFTER } from './core/pet/pup';
import { AdoptScreen } from './ui/screens/AdoptScreen';
import { setMusic, sfx, unlockAudio } from './ui/audio';
import { PuzzleScreen } from './ui/screens/PuzzleScreen';
import { Title } from './ui/screens/Title';
import { touchLastSeen } from './store/lastSeen';
import { WorldMap } from './ui/screens/WorldMap';

const BonusScreen = lazy(() => import('./ui/screens/BonusScreen').then((m) => ({ default: m.BonusScreen })));
const HowTo = lazy(() => import('./ui/screens/HowTo').then((m) => ({ default: m.HowTo })));
const Kennel = lazy(() => import('./ui/screens/Kennel').then((m) => ({ default: m.Kennel })));
const Settings = lazy(() => import('./ui/screens/Settings').then((m) => ({ default: m.Settings })));
const DailyScreen = lazy(() => import('./ui/screens/DailyScreen').then((m) => ({ default: m.DailyScreen })));
const EndlessScreen = lazy(() => import('./ui/screens/EndlessScreen').then((m) => ({ default: m.EndlessScreen })));
const PupScreen = lazy(() => import('./ui/screens/PupScreen').then((m) => ({ default: m.PupScreen })));
const PackScreen = lazy(() => import('./ui/screens/PackScreen').then((m) => ({ default: m.PackScreen })));
const FairScreen = lazy(() => import('./ui/screens/FairScreen').then((m) => ({ default: m.FairScreen })));
const ExpeditionsScreen = lazy(() => import('./ui/screens/ExpeditionsScreen').then((m) => ({ default: m.ExpeditionsScreen })));
const AlbumScreen = lazy(() => import('./ui/screens/ExpeditionsScreen').then((m) => ({ default: m.AlbumScreen })));
const ArcadeScreen = lazy(() => import('./ui/screens/ArcadeScreen').then((m) => ({ default: m.ArcadeScreen })));
const ArcadePlayScreen = lazy(() => import('./ui/screens/ArcadeScreen').then((m) => ({ default: m.ArcadePlayScreen })));
const YardScreen = lazy(() => import('./ui/screens/YardScreen').then((m) => ({ default: m.YardScreen })));
const StatsScreen = lazy(() => import('./ui/screens/StatsScreen').then((m) => ({ default: m.StatsScreen })));
// Only `npm run dev` builds include the debug screen.
const DebugScreen = import.meta.env.DEV ? lazy(() => import('./debug/DebugScreen').then((m) => ({ default: m.DebugScreen }))) : null;

const CLICKABLE = '.btn, .tool, .powerup, .node, .chip, .tab';

function Router() {
  const screen = useNav((s) => s.screen);
  const hasPup = useSave((s) => !!s.pup);
  if (!hasPup && ['title', 'pup', 'yard', 'pack', 'fair', 'expeditions', 'album'].includes(screen.name)) return <AdoptScreen />;
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
    case 'pup':
      return <PupScreen />;
    case 'yard':
      return <YardScreen />;
    case 'pack':
      return <PackScreen />;
    case 'fair':
      return <FairScreen />;
    case 'expeditions':
      return <ExpeditionsScreen />;
    case 'album':
      return <AlbumScreen />;
    case 'arcade':
      return <ArcadeScreen />;
    case 'arcadePlay':
      return <ArcadePlayScreen key={`${screen.game}:${screen.difficulty}`} game={screen.game} difficulty={screen.difficulty} />;
    case 'debug':
      return DebugScreen ? <DebugScreen /> : <Title />;
    case 'debugGame':
      return import.meta.env.DEV ? (
        <BonusScreen
          key={`${screen.game}-${screen.tier}-${screen.seed}`}
          debug
          level={{ id: 0, world: 1, kind: 'bonus', bonusIndex: screen.tier - 1, game: screen.game, tier: screen.tier, seed: screen.seed }}
        />
      ) : (
        <Title />
      );
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

  // Track time away for the pup's "missed you" greeting.
  useEffect(() => {
    const onVisibility = () => {
      const away = useSave.getState().pup ? touchLastSeen() : 0;
      if (document.visibilityState === 'visible' && away >= GREETING_AFTER) useNav.getState().setGreeting(away);
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onVisibility);
    };
  }, []);

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
