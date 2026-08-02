#!/usr/bin/env node
/**
 * Transcodes the raw workout footage (GIF / MP4 / AVIF) in the repo root into
 * web-optimised, mobile-friendly clips under public/media.
 *
 * Every source becomes:
 *   public/media/<slug>[-2|-3].mp4   h.264, <=720px, silent, faststart
 *   public/media/<slug>[-2|-3].jpg   poster frame
 *
 * Run once:            node scripts/build-media.mjs
 * Rebuild one clip:    node scripts/build-media.mjs --only=db-tricep-kickback
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");
const SOURCE_ROOT = resolve(APP_ROOT, "..");
const OUT_DIR = join(APP_ROOT, "public", "media");
const MAP = JSON.parse(readFileSync(join(__dirname, "media-map.json"), "utf8"));

mkdirSync(OUT_DIR, { recursive: true });

// Cap the long edge at 720px, keep dimensions even for h.264.
const SCALE = "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))'";

const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

const probeDuration = (file) =>
  parseFloat(
    execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      file,
    ]).toString().trim(),
  ) || 3;

// `--only=slug` re-encodes a single exercise without touching the rest.
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",") : null;

let sourceBytes = 0;
let outBytes = 0;
const manifest = existsSync(join(OUT_DIR, "manifest.json"))
  ? JSON.parse(readFileSync(join(OUT_DIR, "manifest.json"), "utf8"))
  : {};

for (const [slug, sources] of Object.entries(MAP)) {
  if (only && !only.includes(slug)) continue;
  manifest[slug] = [];

  sources.forEach((relative, index) => {
    const input = join(SOURCE_ROOT, relative);
    if (!existsSync(input)) {
      console.warn(`  !! missing source: ${relative}`);
      return;
    }
    sourceBytes += statSync(input).size;

    const name = index === 0 ? slug : `${slug}-${index + 1}`;
    const mp4 = join(OUT_DIR, `${name}.mp4`);
    const jpg = join(OUT_DIR, `${name}.jpg`);

    ff([
      "-i", input,
      "-an",
      "-vf", `${SCALE},format=yuv420p`,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "28",
      "-movflags", "+faststart",
      // GIF sources have odd frame timing; normalise so loops play smoothly.
      "-r", "24",
      mp4,
    ]);

    ff(["-ss", String(probeDuration(mp4) * 0.4), "-i", mp4, "-frames:v", "1", "-vf", SCALE, "-q:v", "5", jpg]);

    outBytes += statSync(mp4).size + statSync(jpg).size;
    manifest[slug].push(name);
    console.log(`  ✓ ${name}.mp4  ${(statSync(mp4).size / 1024).toFixed(0)}KB`);
  });
}

writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(`\nsource ${mb(sourceBytes)}MB  →  output ${mb(outBytes)}MB`);
