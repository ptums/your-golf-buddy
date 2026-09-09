// Rasterises a hand-authored SVG to public/og.png (1200×630) before `astro build`.
// Regenerate whenever the branding here changes. Kept out of git — build output.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../public/og.png");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffbeb"/>
      <stop offset="1" stop-color="#fef3c7"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="20" height="630" fill="#f97316"/>
  <text x="90" y="250" font-family="Helvetica, Arial, sans-serif" font-size="82" font-weight="800" fill="#0f172a">Your Golf Buddy</text>
  <text x="90" y="320" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#475569">Track every round. Keep every note.</text>
  <text x="90" y="372" font-family="Helvetica, Arial, sans-serif" font-size="36" fill="#475569">Free, offline, no account.</text>
  <g transform="translate(90,470)">
    <circle cx="34" cy="34" r="34" fill="#f97316"/>
    <circle cx="34" cy="36" r="20" fill="#fffbeb"/>
    <circle cx="27" cy="30" r="3.5" fill="#f97316"/>
    <circle cx="41" cy="30" r="3.5" fill="#f97316"/>
    <circle cx="34" cy="44" r="3.5" fill="#f97316"/>
    <text x="88" y="46" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#0f172a">yourbuddy.golf</text>
  </g>
</svg>`;

await mkdir(dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("wrote", out);
