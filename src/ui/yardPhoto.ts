/** Yard photo mode: draws the live yard scene onto a canvas and exports a PNG. */

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const FOOTER = 34;

function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const xml = new XMLSerializer().serializeToString(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not draw a dog'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#bfe6ff');
  sky.addColorStop(1, '#e6f6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const top = h * 0.55;
  const grass = ctx.createLinearGradient(0, top, 0, h);
  grass.addColorStop(0, '#8fd06b');
  grass.addColorStop(1, '#6cb64f');
  ctx.fillStyle = grass;
  ctx.fillRect(0, top, w, h - top);
  ctx.fillStyle = '#f3e2c6';
  for (let x = 0; x < w; x += 22) ctx.fillRect(x, top - 26, 8, 22);
  ctx.fillStyle = '#e2cba5';
  ctx.fillRect(0, top - 4, w, 4);
}

/**
 * Snapshots the yard as it looks right now (decor, dogs mid-animation, bowl)
 * with a small caption strip underneath.
 */
export async function captureYard(scene: HTMLElement, caption: string, scale = 3): Promise<Blob> {
  const box = scene.getBoundingClientRect();
  const w = box.width;
  const h = box.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round((h + FOOTER) * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');
  ctx.scale(scale, scale);
  drawBackdrop(ctx, w, h);

  for (const el of scene.querySelectorAll<HTMLElement>('.yard-deco, .yard-dog, .yard-bowl')) {
    const svg = el.querySelector('svg');
    const r = (svg ?? el).getBoundingClientRect();
    const x = r.left - box.left;
    const y = r.top - box.top;
    if (svg) {
      ctx.drawImage(await svgImage(svg), x, y, r.width, r.height);
    } else {
      const size = parseFloat(getComputedStyle(el).fontSize) || 32;
      ctx.font = `${size}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.textContent ?? '', x + r.width / 2, y + r.height / 2);
    }
  }

  ctx.fillStyle = '#fffaf2';
  ctx.fillRect(0, h, w, FOOTER);
  ctx.fillStyle = '#3b2f2a';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 14px Nunito, system-ui, sans-serif`;
  ctx.fillText(caption, 12, h + FOOTER / 2);
  ctx.textAlign = 'right';
  ctx.font = `800 13px Nunito, system-ui, sans-serif`;
  ctx.fillText('🐶 Woofdoku', w - 12, h + FOOTER / 2);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the photo'))), 'image/png'));
}

export const photoFile = (blob: Blob, name: string) => new File([blob], name, { type: 'image/png' });

/** True when the browser can share image files (mostly mobile). */
export function canShareImage(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
