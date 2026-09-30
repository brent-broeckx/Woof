# 07 — Art, Audio & UX

## Visual direction
- **Cozy, soft, rounded**: pastel region colors, thick rounded tile corners, subtle paper/grass texture.
- Flat vector dogs (SVG), big heads, simple expressions — one **breed per region color** so each yard's dog is recognizable (Corgi, Husky, Dachshund, Poodle, Shiba, Beagle, Pug, Dalmatian, Golden Retriever, Frenchie, Border Collie).
- Each world has its own background & map art (backyard grass, park paths, beach sand, mountain snow).

## Region palette (colorblind-aware)
- 11 distinct pastel colors, checked with deuteranopia/protanopia/tritanopia simulators.
- **Never rely on color alone**: optional **pattern** per region (dots, stripes, checks, waves…), plus thick borders between regions.

## Asset plan
| Asset | Source |
|---|---|
| Dog breed sprites (idle, happy, sad) | custom SVGs |
| UI icons (power-ups, bones, treats) | custom SVG set in one style |
| Fonts | Google Fonts, e.g. **Fredoka** (headings) + **Nunito** (body) |
| Sounds | CC0 (kenney.nl / freesound): soft pops, barks, chimes |
| Music | 2–3 CC0 lo-fi loops, optional per world |

Placeholder art (emoji / colored circles) in Phases 1–3; real art in Phase 4.

## Juice / feedback
- Correct dog: pop-in with squash & stretch, happy bark, sparkle; auto-X's ripple outward.
- Wrong dog: shake, sad whine, bone icon cracks.
- Row/col/yard completed: brief glow.
- Level complete: all dogs jump + confetti paws; stars fly in one by one.
- Power-up use: distinct animation (sniff = nose trail, fetch = ball bouncing across the line).
- Haptics via `navigator.vibrate` where supported (toggle).

## Accessibility
- Colorblind patterns, high-contrast mode.
- Full keyboard control; screen-reader labels ("Row 3, column 2, blue yard, crossed").
- Reduced motion (respects `prefers-reduced-motion`).
- Tap targets ≥ 44 px; board scales to viewport; portrait & landscape.
- Placement-mode toggle as alternative to double-tap.

## Settings
Sound, music, haptics, auto-cross, conflict highlight, patterns, high contrast, reduced motion, placement mode, reset / export / import save.

## Layout
- Mobile portrait: HUD top, board middle, tray bottom (thumb-reachable).
- Desktop: board centered, side panel with power-ups & rules.

## Implementation notes (Phase 4)
- **Audio:** no audio files — all SFX are synthesized with WebAudio (`src/ui/audio.ts`) and background music is a soft generative loop. Sound, music and haptics each have a toggle; audio unlocks on first user gesture.
- **Juice:** a ripple wave across the board on win (delay by distance from the last placed dog), confetti on wins / 3★ bonus results / chest opens.
- **Accessibility:** per-region **patterns** (8 SVG-free CSS patterns) and a **high-contrast** palette override any board theme.
- **Cosmetics:** board themes change the region palette; accessories (bandana, bow, hats, shades, crown…) are SVG overlays on every placed dog.
- **Layout:** phones stack HUD → board → tools; at ≥900×560 the HUD, tools and power-ups move to a side panel next to the board.
