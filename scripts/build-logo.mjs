#!/usr/bin/env node
/**
 * Turns the raw brand logo in the repo root into a web-ready asset.
 *
 * The source is a single black path on an oversized canvas. This crops the
 * viewBox to the artwork's real bounds and bakes in the gold gradient, so the
 * logo renders identically everywhere it's used with no CSS to keep in sync.
 *
 * Run: node scripts/build-logo.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(__dirname, "..", "..", "brand_logo.text");
const OUT = join(__dirname, "..", "public", "logo.svg");

/** Measured from the rendered path — the artwork sits inset in a 3000×1603 box. */
const BOX = { x: 10, y: 208, width: 2972, height: 1183 };

/*
 * Brushed-steel gradient drawn straight from the app's own mist scale, so the
 * mark belongs to the same palette as the typography instead of introducing a
 * fifth colour. Neutral also means it never fights the day accent, which swings
 * from orange to pink to blue across the week.
 */
const STEEL_LIGHT = "#eaeff6";
const STEEL_MID = "#bcc5d3";
const STEEL_DEEP = "#69738a";

const source = readFileSync(SOURCE, "utf8");

const pathData = source.match(/<path\s+d="([^"]+)"/)?.[1];
if (!pathData) throw new Error("No <path d=…> found in brand_logo.text");

writeFileSync(
  OUT,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}" role="img" aria-label="ONYX">
  <defs>
    <linearGradient id="onyx-steel" x1="0" y1="0" x2="0.18" y2="1">
      <stop offset="0%" stop-color="${STEEL_LIGHT}"/>
      <stop offset="42%" stop-color="${STEEL_MID}"/>
      <stop offset="82%" stop-color="${STEEL_DEEP}"/>
      <stop offset="100%" stop-color="${STEEL_DEEP}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <path fill="url(#onyx-steel)" d="${pathData}"/>
</svg>
`,
);

console.log(`→ public/logo.svg  (${(readFileSync(OUT).length / 1024).toFixed(0)} KB)`);

/*
 * Also emit a small PNG. The widget renderer (Satori) rasterises images itself,
 * and handing it a 225 KB single-path SVG on every request is wasteful — a 6 KB
 * bitmap draws identically and far faster. Needs headless Chrome; skipped
 * silently if it isn't installed, since the SVG is what the app itself uses.
 */
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (existsSync(CHROME)) {
  // The widget renders on either a dark or a light face, so ship both inks.
  const variants = [
    { name: "logo-mark.png", stops: [STEEL_LIGHT, STEEL_MID, STEEL_DEEP] },
    { name: "logo-mark-dark.png", stops: ["#4a5364", "#333c4b", "#1c222c"] },
  ];

  for (const variant of variants) {
    const scratch = join(tmpdir(), `onyx-${variant.name}.svg`);
    const png = join(__dirname, "..", "public", variant.name);

    writeFileSync(
      scratch,
      readFileSync(OUT, "utf8")
        .replace(STEEL_LIGHT, variant.stops[0])
        .replace(STEEL_MID, variant.stops[1])
        .replace(STEEL_DEEP, variant.stops[2]),
    );

    const html = join(tmpdir(), `onyx-${variant.name}.html`);
    writeFileSync(
      html,
      `<body style="margin:0;background:transparent">
         <img src="file://${scratch}" style="width:560px;display:block">
       </body>`,
    );

    try {
      execFileSync(
        CHROME,
        [
          "--headless",
          "--disable-gpu",
          "--default-background-color=00000000",
          "--force-device-scale-factor=1",
          "--window-size=560,224",
          `--screenshot=${png}`,
          `file://${html}`,
        ],
        { stdio: "ignore" },
      );
      console.log(`→ public/${variant.name}  (${(readFileSync(png).length / 1024).toFixed(0)} KB)`);
    } catch {
      console.warn(`   (skipped ${variant.name} — headless render failed)`);
    }
  }
} else {
  console.warn("   (skipped logo-mark.png — Chrome not found)");
}
