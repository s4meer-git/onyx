#!/usr/bin/env node
/**
 * Generates the grain overlay used on the widget's glass panels.
 *
 * Real frosted glass has sensor-like grain; without it a translucent panel
 * reads as flat plastic. Satori has no filters or blend modes, so the grain
 * ships as a pre-baked transparent PNG that gets laid over each panel.
 *
 * Run: node scripts/build-noise.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "noise.png");
const SIZE = 512;

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

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));

for (let y = 0; y < SIZE; y += 1) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < SIZE; x += 1) {
    // Mostly-white speckle at low alpha: bright enough to catch the light,
    // sparse enough that it never turns into visible static.
    const value = Math.random();
    const offset = rowStart + 1 + x * 4;
    const bright = value > 0.5;
    raw[offset] = bright ? 255 : 140;
    raw[offset + 1] = bright ? 255 : 140;
    raw[offset + 2] = bright ? 255 : 150;
    raw[offset + 3] = Math.round(Math.abs(value - 0.5) * 2 * 46);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

writeFileSync(
  OUT,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);

console.log(`→ public/noise.png  (${SIZE}×${SIZE})`);
