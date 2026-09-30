// Renders the Woofdoku app icon to PNG without any image dependencies.
// Usage: node scripts/make-icons.mjs  (writes public/icons/*.png)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Shapes in a 100×100 design space, painted in order.
const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inTriangle = (a, b, c) => (x, y) => {
  const s = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = s(a, b),
    d2 = s(b, c),
    d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const inRoundRect = (r, pad) => (x, y) => {
  const lo = pad + r,
    hi = 100 - pad - r;
  const dx = Math.max(lo - x, 0, x - hi),
    dy = Math.max(lo - y, 0, y - hi);
  return x >= pad && x <= 100 - pad && y >= pad && y <= 100 - pad && dx * dx + dy * dy <= r * r;
};

function shapes(maskable) {
  // Maskable icons need a full-bleed background and the dog inside the 80% safe zone.
  const k = maskable ? 0.72 : 0.9;
  const t = (x, y) => [50 + (x - 50) * k, 52 + (y - 52) * k];
  const e = (cx, cy, rx, ry) => {
    const [x, y] = t(cx, cy);
    return inEllipse(x, y, rx * k, ry * k);
  };
  const tri = (...pts) => inTriangle(...pts.map(([x, y]) => t(x, y)));
  return [
    [maskable ? () => true : inRoundRect(22, 0), hex('#f6c86b')],
    [tri([20, 46], [26, 8], [48, 30]), hex('#e08a3c')],
    [tri([80, 46], [74, 8], [52, 30]), hex('#e08a3c')],
    [e(50, 56, 33, 31), hex('#f2a65a')],
    [e(50, 71, 17, 13), hex('#fff4e6')],
    [e(38, 51, 4.6, 4.6), hex('#2d2320')],
    [e(62, 51, 4.6, 4.6), hex('#2d2320')],
    [e(50, 64, 6.5, 4.8), hex('#2d2320')],
    [e(50, 76, 4.5, 4), hex('#f28b9b')],
  ];
}

function render(size, maskable) {
  const list = shapes(maskable);
  const SS = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 100;
          const y = ((py + (sy + 0.5) / SS) / size) * 100;
          let col = null;
          for (const [hit, c] of list) if (hit(x, y)) col = c;
          if (col) {
            r += col[0];
            g += col[1];
            b += col[2];
            a += 255;
          }
        }
      const n = SS * SS,
        cov = a / 255;
      const o = 1 + px * 4;
      row[o] = cov ? Math.round(r / cov) : 0;
      row[o + 1] = cov ? Math.round(g / cov) : 0;
      row[o + 2] = cov ? Math.round(b / cov) : 0;
      row[o + 3] = Math.round(a / n);
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]) {
  writeFileSync(new URL(name, out), render(size, maskable));
  console.log('wrote', name);
}
