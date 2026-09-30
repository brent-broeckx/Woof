import { useEffect } from 'react';
import { getLevel } from './core/progression/levels';
import { useNav } from './store/navStore';
import { highestUnlocked, useSave } from './store/saveStore';
import { BonusScreen } from './ui/screens/BonusScreen';
import { HowTo } from './ui/screens/HowTo';
import { Kennel } from './ui/screens/Kennel';
import { PuzzleScreen } from './ui/screens/PuzzleScreen';
import { Settings } from './ui/screens/Settings';
import { Title } from './ui/screens/Title';
import { WorldMap } from './ui/screens/WorldMap';

export function App() {
  const screen = useNav((s) => s.screen);
  const reducedMotion = useSave((s) => s.settings.reducedMotion);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

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
