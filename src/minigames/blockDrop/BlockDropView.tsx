import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MiniGameProps } from '../registry';
import { BlockDropGame, HEIGHT, PIECE_COLORS, WIDTH, blockDropConfigForTier, pieceCells, type PieceType } from './logic';

const CELL = 24;

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = CELL, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, size * 0.22);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.roundRect(x * size + 3, y * size + 3, size - 6, size * 0.28, size * 0.12);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function MiniPiece({ type }: { type: PieceType | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 56, 36);
    if (!type) return;
    const cells = pieceCells(type, 0);
    const minX = Math.min(...cells.map((c) => c[0]));
    const maxX = Math.max(...cells.map((c) => c[0]));
    const minY = Math.min(...cells.map((c) => c[1]));
    const maxY = Math.max(...cells.map((c) => c[1]));
    const s = 12;
    const ox = (56 - (maxX - minX + 1) * s) / 2 / s - minX;
    const oy = (36 - (maxY - minY + 1) * s) / 2 / s - minY;
    for (const [x, y] of cells) drawBlock(ctx, x + ox, y + oy, PIECE_COLORS[type], s);
  }, [type]);
  return <canvas ref={ref} width={56} height={36} className="mini-piece" />;
}

export default function BlockDropView({ tier, seed, onFinish }: MiniGameProps) {
  const config = useMemo(() => blockDropConfigForTier(tier), [tier]);
  const gameRef = useRef<BlockDropGame>(null as unknown as BlockDropGame);
  if (!gameRef.current) gameRef.current = new BlockDropGame(config, seed);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const finished = useRef(false);
  const rerender = useCallback(() => setVersion((v) => v + 1), []);

  const draw = useCallback(() => {
    const g = gameRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH * CELL, HEIGHT * CELL);
    ctx.strokeStyle = 'rgba(90,70,50,0.07)';
    for (let x = 1; x < WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, HEIGHT * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(WIDTH * CELL, y * CELL);
      ctx.stroke();
    }
    g.board.forEach((c, i) => c && drawBlock(ctx, i % WIDTH, Math.floor(i / WIDTH), PIECE_COLORS[c]));
    if (!g.over) {
      const cells = pieceCells(g.current.type, g.current.rot);
      const gy = g.ghostY();
      for (const [cx, cy] of cells) if (gy + cy >= 0) drawBlock(ctx, g.current.x + cx, gy + cy, PIECE_COLORS[g.current.type], CELL, 0.25);
      for (const [cx, cy] of cells) if (g.current.y + cy >= 0) drawBlock(ctx, g.current.x + cx, g.current.y + cy, PIECE_COLORS[g.current.type]);
    }
  }, []);

  const afterAction = useCallback(() => {
    const g = gameRef.current;
    draw();
    rerender();
    if (g.over && !finished.current) {
      finished.current = true;
      const stars = g.stars();
      window.setTimeout(() => onFinish({ stars, summary: `${g.lines}/${g.config.goalLines} lines${g.toppedOut ? ' (stacked out!)' : ''}` }), 600);
    }
  }, [draw, rerender, onFinish]);

  const act = useCallback(
    (fn: (g: BlockDropGame) => void) => {
      if (paused || gameRef.current.over) return;
      fn(gameRef.current);
      afterAction();
    },
    [paused, afterAction],
  );

  // Gravity loop
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const loop = (now: number) => {
      acc += now - last;
      last = now;
      const g = gameRef.current;
      if (!g.over && acc >= g.config.gravityMs) {
        acc = 0;
        g.step();
        afterAction();
      }
      if (!g.over) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, afterAction]);

  useEffect(() => draw(), [draw]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, (g: BlockDropGame) => void> = {
        ArrowLeft: (g) => g.move(-1),
        ArrowRight: (g) => g.move(1),
        ArrowUp: (g) => g.rotate(1),
        z: (g) => g.rotate(-1),
        x: (g) => g.rotate(1),
        ArrowDown: (g) => g.step(),
        ' ': (g) => g.hardDrop(),
        c: (g) => g.holdPiece(),
        Shift: (g) => g.holdPiece(),
      };
      const fn = map[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (e.key === 'p' || e.key === 'Escape') {
        setPaused((p) => !p);
        return;
      }
      if (!fn) return;
      e.preventDefault();
      act(fn);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  // Swipe gestures on the canvas
  const touch = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    touch.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const t = touch.current;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 26) {
      act((g) => g.move(dx > 0 ? 1 : -1));
      t.x = e.clientX;
      t.moved = true;
    } else if (dy > 26) {
      act((g) => g.step());
      t.y = e.clientY;
      t.moved = true;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dt = performance.now() - t.t;
    if (!t.moved && dt < 250) act((g) => g.rotate(1));
    else if (e.clientY - t.y > 60 && dt < 300) act((g) => g.hardDrop());
  };

  const g = gameRef.current;
  return (
    <div className="minigame blockdrop-game">
      <div className="mg-stats">
        <span>
          🧱 {g.lines}/{g.config.goalLines} lines
        </span>
        <span>📦 {g.piecesLeft} blocks left</span>
      </div>
      <div className="bd-layout">
        <div className="bd-side">
          <div className="bd-label">Hold (C)</div>
          <MiniPiece type={g.hold} />
          <div className="bd-goal">
            <div className="bd-goal-bar" style={{ height: `${Math.min(100, (g.lines / g.config.goalLines) * 100)}%` }} />
          </div>
        </div>
        <div className="bd-well">
          <canvas
            ref={canvasRef}
            width={WIDTH * CELL}
            height={HEIGHT * CELL}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (touch.current = null)}
          />
          {paused && (
            <div className="bd-paused" onClick={() => setPaused(false)}>
              ⏸ Paused — tap to resume
            </div>
          )}
        </div>
        <div className="bd-side">
          <div className="bd-label">Next</div>
          {g.queue.slice(0, 3).map((t, i) => (
            <MiniPiece key={i} type={t} />
          ))}
        </div>
      </div>
      <div className="bd-controls">
        <button
          className="btn"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.move(-1));
          }}
          aria-label="Left"
        >
          ◀
        </button>
        <button
          className="btn"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.rotate(1));
          }}
          aria-label="Rotate"
        >
          ⟳
        </button>
        <button
          className="btn"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.move(1));
          }}
          aria-label="Right"
        >
          ▶
        </button>
        <button
          className="btn"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.step());
          }}
          aria-label="Soft drop"
        >
          ▼
        </button>
        <button
          className="btn primary"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.hardDrop());
          }}
          aria-label="Hard drop"
        >
          ⤓
        </button>
        <button
          className="btn"
          onPointerDown={(e) => {
            e.preventDefault();
            act((x) => x.holdPiece());
          }}
          aria-label="Hold"
        >
          Hold
        </button>
        <button className="btn ghost" onClick={() => setPaused((p) => !p)} aria-label="Pause">
          {paused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
}
