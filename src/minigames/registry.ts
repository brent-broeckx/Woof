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
};
