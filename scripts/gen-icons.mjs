// Génère les icônes PNG de la PWA sans dépendance (encodeur PNG minimal).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [13, 14, 18];
const RING = [94, 230, 168];
const DOT = [255, 194, 75];

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x + 0.5, y + 0.5, size);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const cov = (sdf) => Math.min(1, Math.max(0, 0.5 - sdf));

// Anneau ouvert (arc de progression) + point doré : « la régularité qui boucle ».
function pixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy);
  const ringR = size * 0.27;
  const half = size * 0.055;
  const ang = Math.atan2(dy, dx); // −π..π, 0 à droite
  let c = BG;
  const inArc = !(ang > -Math.PI / 2 && ang < -Math.PI / 4); // petite ouverture en haut à droite
  if (inArc) c = mix(c, RING, cov(Math.abs(r - ringR) - half));
  const a = -Math.PI / 4 - 0.05;
  const px = cx + Math.cos(a) * ringR;
  const py = cy + Math.sin(a) * ringR;
  c = mix(c, DOT, cov(Math.hypot(x - px, y - py) - size * 0.075));
  return c;
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(`public/${name}`, png(size, pixel));
}

writeFileSync(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0d0e12"/><path d="M50 23 A27 27 0 1 0 69.1 30.9" fill="none" stroke="#5ee6a8" stroke-width="11" stroke-linecap="round"/><circle cx="69.1" cy="30.9" r="7.5" fill="#ffc24b"/></svg>`,
);
console.log('Icônes générées dans public/');
