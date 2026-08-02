#!/usr/bin/env node
/**
 * Generates the PWA icons (no image dependencies — raw PNG encoding).
 * Run: node scripts/build-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

function png(size, paint) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint(x, y, size);
      const offset = rowStart + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Dark rounded tile with an orange gradient glow and a white dumbbell. */
const paint = (x, y, size) => {
  const u = x / size;
  const v = y / size;

  // Background: deep ink with a warm glow from the top-left.
  const glow = Math.max(0, 1 - Math.hypot(u - 0.25, v - 0.15) * 1.5);
  let r = 10 + glow * 245;
  let g = 11 + glow * 112;
  let b = 14 + glow * 16;

  // Dumbbell: a central bar with two plates on each side.
  const cx = 0.5;
  const cy = 0.5;
  const inBar = Math.abs(v - cy) < 0.052 && Math.abs(u - cx) < 0.34;
  const inPlate =
    (Math.abs(Math.abs(u - cx) - 0.235) < 0.062 && Math.abs(v - cy) < 0.2) ||
    (Math.abs(Math.abs(u - cx) - 0.335) < 0.05 && Math.abs(v - cy) < 0.128);

  if (inBar || inPlate) {
    r = 255;
    g = 255;
    b = 255;
  }

  // Rounded-rect mask so the tile looks right on Android's adaptive grid.
  const radius = 0.22;
  const dx = Math.max(Math.abs(u - 0.5) - (0.5 - radius), 0);
  const dy = Math.max(Math.abs(v - 0.5) - (0.5 - radius), 0);
  const alpha = Math.hypot(dx, dy) > radius ? 0 : 255;

  return [Math.min(255, r), Math.min(255, g), Math.min(255, b), alpha];
};

for (const size of [180, 192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), png(size, paint));
  console.log(`  ✓ icon-${size}.png`);
}

writeFileSync(
  join(OUT, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><radialGradient id="g" cx="25%" cy="15%"><stop offset="0" stop-color="#ff7a1a"/><stop offset="1" stop-color="#0a0b0e"/></radialGradient></defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <g fill="#fff"><rect x="16" y="45" width="68" height="10" rx="3"/>
  <rect x="20.3" y="30" width="12.4" height="40" rx="4"/><rect x="67.3" y="30" width="12.4" height="40" rx="4"/>
  <rect x="11.5" y="37" width="10" height="26" rx="3.5"/><rect x="78.5" y="37" width="10" height="26" rx="3.5"/></g>
</svg>
`,
);
console.log("  ✓ icon.svg");
