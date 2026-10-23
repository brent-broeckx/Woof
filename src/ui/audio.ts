import { useSave } from '../store/saveStore';

/**
 * Tiny WebAudio synth: every sound is generated on the fly, so the game ships
 * without audio files. Settings are read on every call so toggles apply at once.
 */
export type Sfx = 'pop' | 'x' | 'wrong' | 'win' | 'star' | 'power' | 'click' | 'bark' | 'reward';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SOUNDS: Record<Sfx, () => void> = {
  pop: () => {
    tone(520, 0, 0.12, 'triangle', 0.35, 880);
    tone(1040, 0.05, 0.08, 'sine', 0.12);
  },
  x: () => tone(300, 0, 0.05, 'square', 0.06, 220),
  click: () => tone(660, 0, 0.04, 'triangle', 0.08),
  wrong: () => {
    tone(220, 0, 0.18, 'sawtooth', 0.12, 150);
    tone(160, 0.12, 0.22, 'sawtooth', 0.1, 110);
  },
  bark: () => {
    tone(420, 0, 0.07, 'sawtooth', 0.14, 260);
    tone(460, 0.11, 0.08, 'sawtooth', 0.14, 280);
  },
  power: () => [0, 0.06, 0.12, 0.18].forEach((d, i) => tone(600 + i * 200, d, 0.14, 'triangle', 0.18)),
  star: () => tone(1320, 0, 0.25, 'sine', 0.2, 1760),
  reward: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.2, 'triangle', 0.2)),
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.22));
    tone(1568, 0.5, 0.5, 'sine', 0.12);
  },
};

export function sfx(name: Sfx) {
  if (!useSave.getState().settings.sound) return;
  try {
    SOUNDS[name]();
  } catch {
    /* audio is best-effort */
  }
}

export function haptic(pattern: number | number[] = 15) {
  if (!useSave.getState().settings.haptics) return;
  navigator.vibrate?.(pattern);
}

// ---------------------------------------------------------------------------
// Generative lo-fi music: a gentle pentatonic arpeggio over soft chords.

const CHORDS = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66],
];
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let musicTimer: number | null = null;
let step = 0;

function musicStep() {
  const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
  if (step % 8 === 0) chord.forEach((f) => tone(f / 2, 0, 2.2, 'sine', 0.05));
  if (step % 2 === 0 || Math.random() < 0.3) tone(PENTA[(step * 7 + Math.floor(Math.random() * 3)) % PENTA.length], 0, 0.5, 'triangle', 0.035);
  step++;
}

/** Resume audio inside a user gesture (browsers block it before that). */
export function unlockAudio() {
  audio();
}

export function setMusic(on: boolean) {
  if (on && musicTimer === null) {
    if (!audio()) return;
    musicTimer = window.setInterval(musicStep, 300);
  } else if (!on && musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
