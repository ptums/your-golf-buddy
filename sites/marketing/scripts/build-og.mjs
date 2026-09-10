// Rasterises a hand-authored SVG to public/og.png (1200×630) before `astro build`.
// Broadsheet: ink on paper, header rule pair, a bold system sans. Kept out of git.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../public/og.png");

// System sans that the CI render environment (librsvg) actually has.
const SANS =
  "'SF Pro Rounded', 'Helvetica Neue', 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f3f2f2"/>
  <rect x="90" y="86" width="1020" height="10" fill="#201e1d"/>
  <text x="90" y="140" font-family="${SANS}" font-size="22" font-weight="700" letter-spacing="4" fill="#201e1d">YOUR GOLF BUDDY</text>
  <rect x="90" y="156" width="1020" height="3" fill="#201e1d"/>
  <text x="90" y="322" font-family="${SANS}" font-size="90" font-weight="800" fill="#201e1d">Track every round.</text>
  <text x="90" y="422" font-family="${SANS}" font-size="90" font-weight="800" fill="#201e1d">Keep every note.</text>
  <text x="90" y="500" font-family="${SANS}" font-size="34" fill="#444141">Free, offline, no account. — yourbuddy.golf</text>
  <rect x="90" y="540" width="1020" height="3" fill="#201e1d"/>
</svg>`;

await mkdir(dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log("wrote", out);
