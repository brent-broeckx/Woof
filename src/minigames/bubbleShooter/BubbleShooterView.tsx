import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haptic, sfx } from '../../ui/audio';
import type { MiniGameProps } from '../registry';
import './bubbleShooter.css';
import {
  FIELD_H,
  FIELD_W,
  LAUNCH_X,
  LAUNCH_Y,
  MAX_ROWS,
  ROW_H,
  aimAt,
  bubbleConfigForTier,
  bubbleStars,
  cellCenter,
  clampAim,
  clearedRatio,
  createBubbleState,
  fireShot,
  swapBubbles,
  traceShot,
  type BubbleState,
  type ShotResult,
} from './logic';

/** Glossy, high-contrast bubble colours (like the classic game). */
export const BUBBLE_COLORS = ['#e8364f', '#2f6fe4', '#f4c430', '#34b553', '#a24de0', '#22c3d6'];
const SCALE = 44;
const FLIGHT_SPEED = 24;
const NEXT_X = LAUNCH_X + 1.7;
const NEXT_Y = LAUNCH_Y + 0.25;
const AIM_STEP = (3 * Math.PI) / 180;

interface Effect {
  x: number;
  y: number;
  color: number;
  start: number;
  kind: 'pop' | 'drop';
  vx: number;
}

interface Flight {
  result: ShotResult;
  start: number;
  length: number;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: number, scale = 1, alpha = 1) {
  const base = BUBBLE_COLORS[color % BUBBLE_COLORS.length];
  const r = 0.48 * scale;
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(base, 0.7));
  g.addColorStop(0.35, base);
  g.addColorStop(1, shade(base, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Paw print
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.22, r * 0.26, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [tx, ty] of [
    [-0.3, -0.08],
    [-0.11, -0.3],
    [0.11, -0.3],
    [0.3, -0.08],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + tx * r, y + ty * r, r * 0.09, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.42, y - r * 0.45, r * 0.16, r * 0.1, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function pointAlong(path: [number, number][], dist: number): [number, number] {
  let left = dist;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (left <= seg && seg > 0) return [ax + ((bx - ax) * left) / seg, ay + ((by - ay) * left) / seg];
    left -= seg;
  }
  return path[path.length - 1];
}

function pathLength(path: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return total;
}

export default function BubbleShooterView({ tier, seed, onFinish }: MiniGameProps) {
  const config = useMemo(() => bubbleConfigForTier(tier), [tier]);
  const [state, setState] = useState<BubbleState>(() => createBubbleState(config, seed));
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const aimRef = useRef(0);
  const flightRef = useRef<Flight | null>(null);
  const effectsRef = useRef<Effect[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const finished = useRef(false);
  const pointer = useRef<{ mode: 'aim' | 'swap' } | null>(null);

  const finish = useCallback(
    (s: BubbleState) => {
      if (finished.current) return;
      finished.current = true;
      const pct = Math.round(Math.max(0, clearedRatio(s)) * 100);
      const summary = s.cleared
        ? `Board cleared with ${s.shotsLeft} shot${s.shotsLeft === 1 ? '' : 's'} to spare`
        : `${pct}% cleared${s.overflow ? ' (bubbles reached the line!)' : ' (out of shots)'}`;
      if (s.cleared) sfx('win');
      window.setTimeout(() => onFinish({ stars: bubbleStars(s), summary }), 900);
    },
    [onFinish],
  );

  const land = useCallback(
    (flight: Flight, now: number) => {
      const { result } = flight;
      flightRef.current = null;
      const before = stateRef.current;
      for (const [list, kind] of [
        [result.popped, 'pop'],
        [result.dropped, 'drop'],
      ] as const) {
        for (const [r, c] of list) {
          const [x, y] = cellCenter(before, r, c);
          const color = r === result.placed[0] && c === result.placed[1] ? result.color : (before.grid[r]?.[c] ?? result.color);
          effectsRef.current.push({ x, y, color, start: now + (kind === 'drop' ? 80 : 0), kind, vx: (Math.random() - 0.5) * 2 });
        }
      }
      if (result.popped.length) {
        sfx('pop');
        haptic(result.dropped.length ? [15, 30, 15] : 15);
      } else sfx('click');
      if (result.ceilingDropped) haptic(40);
      stateRef.current = result.state;
      setState(result.state);
      if (result.state.over) finish(result.state);
    },
    [finish],
  );

  const shoot = useCallback(() => {
    if (flightRef.current || finished.current) return;
    const result = fireShot(stateRef.current, aimRef.current);
    if (!result) return;
    flightRef.current = { result, start: performance.now(), length: pathLength(result.path) };
  }, []);

  const swap = useCallback(() => {
    if (flightRef.current || finished.current) return;
    const next = swapBubbles(stateRef.current);
    if (next === stateRef.current) return;
    sfx('click');
    stateRef.current = next;
    setState(next);
  }, []);

  // Render loop
  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(FIELD_W * SCALE * dpr);
      const h = Math.round(FIELD_H * SCALE * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(SCALE * dpr, 0, 0, SCALE * dpr, 0, 0);
      const s = stateRef.current;
      const flight = flightRef.current;

      const bg = ctx.createLinearGradient(0, 0, 0, FIELD_H);
      bg.addColorStop(0, '#cfd2ff');
      bg.addColorStop(1, '#e9eaff');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);

      // Sunken ceiling
      if (s.ceiling > 0) {
        ctx.fillStyle = '#b48a62';
        ctx.fillRect(0, 0, FIELD_W, s.ceiling * ROW_H);
        ctx.fillStyle = '#8a6544';
        for (let x = 0.2; x < FIELD_W; x += 0.8) ctx.fillRect(x, 0, 0.12, s.ceiling * ROW_H);
      }
      ctx.fillStyle = '#8a6544';
      ctx.fillRect(0, s.ceiling * ROW_H - 0.06, FIELD_W, 0.06);

      // Danger line
      const lineY = MAX_ROWS * ROW_H + 0.13;
      ctx.strokeStyle = 'rgba(232,54,79,0.55)';
      ctx.lineWidth = 0.05;
      ctx.setLineDash([0.25, 0.18]);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(FIELD_W, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      s.grid.forEach((row, r) =>
        row.forEach((c, col) => {
          if (c === null) return;
          const [x, y] = cellCenter(s, r, col);
          drawBubble(ctx, x, y, c);
        }),
      );

      // Aim guide
      if (!flight && !s.over) {
        const { path } = traceShot(s, aimRef.current);
        const total = pathLength(path) - 0.6;
        ctx.fillStyle = shade(BUBBLE_COLORS[s.current % BUBBLE_COLORS.length], -0.2);
        for (let d = 0.8; d < total; d += 0.42) {
          const [x, y] = pointAlong(path, d);
          ctx.globalAlpha = Math.max(0.25, 1 - d / 22);
          ctx.beginPath();
          ctx.arc(x, y, 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Effects
      effectsRef.current = effectsRef.current.filter((e) => {
        const t = (now - e.start) / 1000;
        if (t < 0) {
          drawBubble(ctx, e.x, e.y, e.color);
          return true;
        }
        if (e.kind === 'pop') {
          if (t > 0.25) return false;
          drawBubble(ctx, e.x, e.y, e.color, 1 + t * 2, 1 - t / 0.25);
          return true;
        }
        const y = e.y + 2 * t + 14 * t * t;
        if (y > FIELD_H + 1) return false;
        drawBubble(ctx, e.x + e.vx * t, y, e.color, 1, Math.max(0, 1 - t / 0.9));
        return true;
      });

      // Launcher
      ctx.fillStyle = 'rgba(59,47,42,0.15)';
      ctx.beginPath();
      ctx.ellipse(LAUNCH_X, LAUNCH_Y + 0.55, 0.75, 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      if (flight) {
        const dist = ((now - flight.start) / 1000) * FLIGHT_SPEED;
        if (dist >= flight.length) land(flight, now);
        else {
          const [x, y] = pointAlong(flight.result.path, dist);
          drawBubble(ctx, x, y, flight.result.color);
        }
      } else if (!s.over) drawBubble(ctx, LAUNCH_X, LAUNCH_Y, s.current);
      if (!s.over) {
        drawBubble(ctx, NEXT_X, NEXT_Y, flight ? flight.result.state.current : s.next, 0.7);
        ctx.fillStyle = 'rgba(59,47,42,0.6)';
        ctx.font = '0.3px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('next ⇄', NEXT_X, NEXT_Y + 0.6);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [land]);

  const toField = (e: React.PointerEvent): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * FIELD_W, ((e.clientY - rect.top) / rect.height) * FIELD_H];
  };
  const onLauncher = (x: number, y: number) => Math.hypot(x - LAUNCH_X, y - LAUNCH_Y) < 0.75 || Math.hypot(x - NEXT_X, y - NEXT_Y) < 0.7;

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toField(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (onLauncher(x, y)) {
      pointer.current = { mode: 'swap' };
      return;
    }
    pointer.current = { mode: 'aim' };
    aimRef.current = aimAt(x, y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.mode === 'swap') return;
    if (!pointer.current && e.pointerType !== 'mouse') return;
    const [x, y] = toField(e);
    if (!pointer.current && onLauncher(x, y)) return;
    aimRef.current = aimAt(x, y);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    pointer.current = null;
    if (!p) return;
    const [x, y] = toField(e);
    if (p.mode === 'swap') {
      if (onLauncher(x, y)) swap();
      return;
    }
    // Releasing below the launcher cancels the shot.
    if (y > LAUNCH_Y + 0.6) return;
    aimRef.current = aimAt(x, y);
    shoot();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        aimRef.current = clampAim(aimRef.current + (e.key === 'ArrowLeft' ? -AIM_STEP : AIM_STEP));
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        shoot();
      } else if (e.key.toLowerCase() === 's') {
        swap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shoot, swap]);

  const pct = Math.round(Math.max(0, clearedRatio(state)) * 100);
  const toDrop = state.config.missesPerDrop - state.misses;
  return (
    <div className="minigame bubble-game">
      <div className="mg-stats">
        <span>🫧 {state.shotsLeft} shots</span>
        <span>✨ {pct}% cleared</span>
        <span className={toDrop <= 1 ? 'bubble-warn' : ''}>⬇️ ceiling in {toDrop}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="bubble-canvas"
        style={{ aspectRatio: `${FIELD_W} / ${FIELD_H}` }}
        aria-label="Bubble Bark board. Drag to aim and release to shoot."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointer.current = null)}
      />
      <div className="mg-actions">
        <button className="btn" onClick={swap} disabled={state.over || state.current === state.next}>
          ⇄ Swap
        </button>
      </div>
    </div>
  );
}
