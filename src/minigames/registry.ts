import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { MiniGameId } from '../core/progression/levels';

export interface MiniGameResult {
  stars: 0 | 1 | 2 | 3;
  summary: string;
}

export interface MiniGameProps {
  tier: number;
  seed: number;
  onFinish(result: MiniGameResult): void;
}

export interface MiniGameDefinition {
  id: MiniGameId;
  name: string;
  icon: string;
  tagline: string;
  rules: string[];
  component: LazyExoticComponent<ComponentType<MiniGameProps>>;
}

export const MINI_GAMES: Record<MiniGameId, MiniGameDefinition> = {
  connectLeashes: {
    id: 'connectLeashes',
    name: 'Connect the Leashes',
    icon: '🔗',
    tagline: 'Walk every pair of pups together',
    rules: [
      'Drag from a dog to draw a leash to the dog of the same colour.',
      'Leashes can’t cross. Drawing over another leash cuts it.',
      'The game ends as soon as every pair is connected.',
      '★ all pairs connected · ★★ fill every tile · ★★★ do it in few strokes.',
    ],
    component: lazy(() => import('./connectLeashes/ConnectLeashesView')),
  },
  blockDrop: {
    id: 'blockDrop',
    name: 'Block Drop',
    icon: '🧱',
    tagline: 'Stack kibble crates and clear lines',
    rules: [
      'Move and rotate falling blocks to fill complete rows — full rows disappear.',
      'You only have a limited number of blocks. Reach the line goal for ★★★.',
      'Keys: ← → move · ↑ rotate · ↓ soft drop · Space hard drop · C hold. On mobile use the buttons.',
    ],
    component: lazy(() => import('./blockDrop/BlockDropView')),
  },
  slidingPup: {
    id: 'slidingPup',
    name: 'Sliding Pup',
    icon: '🧩',
    tagline: 'Put the puppy picture back together',
    rules: [
      'Tap a tile next to the gap to slide it.',
      'Restore the picture (numbers go 1, 2, 3… left to right, top to bottom).',
      'Fewer moves = more stars. The target is the minimum number of moves.',
    ],
    component: lazy(() => import('./slidingPup/SlidingPupView')),
  },
  kibbleBlocks: {
    id: 'kibbleBlocks',
    name: 'Kibble Blocks',
    icon: '🍪',
    tagline: 'Pack kibble pieces to clear tasty treat lines',
    rules: [
      'Place all three pieces anywhere they fit on the 8×8 board.',
      'Full rows and columns clear together; treats are collected when their row or column clears.',
      'Collect all treats for ★★★; 60%+ for ★★. Drag or tap-select, then tap a cell.',
    ],
    component: lazy(() => import('./kibbleBlocks/KibbleBlocksView')),
  },
  memoryFetch: {
    id: 'memoryFetch',
    name: 'Memory Fetch',
    icon: '🃏',
    tagline: 'Remember where every pup is hiding',
    rules: [
      'Flip two cards to find matching dog breeds.',
      'Mismatches flip back after a short peek; later tiers swap two hidden cards after 4 misses.',
      'Fewer misses earn more stars.',
    ],
    component: lazy(() => import('./memoryFetch/MemoryFetchView')),
  },
  nonogramPaws: {
    id: 'nonogramPaws',
    name: 'Nonogram Paws',
    icon: '🐾',
    tagline: 'Reveal tiny pup pictures with clues',
    rules: [
      'Fill cells to match each row and column clue.',
      'Use Mark X or right-click/Alt-drag to mark empties; wrong fills turn into X mistakes.',
      'Stars: 0 mistakes = ★★★, up to 2 = ★★, otherwise ★.',
    ],
    component: lazy(() => import('./nonogramPaws/NonogramPawsView')),
  },
  rushHour: {
    id: 'rushHour',
    name: 'Doggy Rush Hour',
    icon: '🚐',
    tagline: 'Slide the dog van out of the lot',
    rules: ['Drag vehicles along their lane only.', 'Free the dog van through the right exit.', 'Stars are based on moves versus the optimal solution.'],
    component: lazy(() => import('./rushHour/RushHourView')),
  },
  waterSort: {
    id: 'waterSort',
    name: 'Water Bowl Sort',
    icon: '🥣',
    tagline: 'Pour colourful water into tidy bowls',
    rules: [
      'Tap a bowl, then another bowl to pour matching top water.',
      'Sort every bowl so it is empty or full of one colour.',
      'Fewer pours than the target earns more stars; Undo and Reset are available.',
    ],
    component: lazy(() => import('./waterSort/WaterSortView')),
  },
  lightsOut: {
    id: 'lightsOut',
    name: 'Kennel Lamps',
    icon: '💡',
    tagline: 'Dim every glowing kennel',
    rules: [
      'Tap a kennel to toggle it and its up/down/left/right neighbours.',
      'Turn every lamp off; Undo and Reset are available.',
      'Stars compare your presses to the optimal solution.',
    ],
    component: lazy(() => import('./lightsOut/LightsOutView')),
  },
  pipeSprinklers: {
    id: 'pipeSprinklers',
    name: 'Pipe Sprinklers',
    icon: '💧',
    tagline: 'Rotate pipes to water every dog bowl',
    rules: [
      'Tap pipes to rotate them clockwise.',
      'Blue pipes are connected to the tap; fix leaks and water all bowls.',
      'Stars are based on rotations versus the target.',
    ],
    component: lazy(() => import('./pipeSprinklers/PipeSprinklersView')),
  },
};
