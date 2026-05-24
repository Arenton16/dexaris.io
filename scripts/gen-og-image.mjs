import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const fontDir = join(root, 'node_modules/@fontsource/plus-jakarta-sans/files');

const svg = `<svg
  width="1200"
  height="630"
  viewBox="0 0 1200 630"
  xmlns="http://www.w3.org/2000/svg"
>
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
      <stop offset="0%"   stop-color="#6B4FFF" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#6B4FFF" stop-opacity="0"    />
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#0C0B1A"/>

  <!-- Radial glow centred on canvas -->
  <ellipse cx="600" cy="315" rx="480" ry="320" fill="url(#bgGlow)"/>

  <!-- Inset border frame -->
  <rect
    x="20" y="20" width="1160" height="590"
    fill="none"
    stroke="rgba(107,79,255,0.2)"
    stroke-width="1"
  />

  <!--
    D4 Rising Prism icon (source viewBox 0 0 44 44)
    Scaled to 80 px tall: factor = 80/44 = 1.8182
    Group horizontally centred alongside text.
    Content group ~394 px wide; left edge = 600 - 197 = 403.
    Icon top-left: (403, 265) → centre at (443, 305)
  -->
  <g transform="translate(403,265) scale(1.8182)">
    <polygon points="4,42 10,26 16,26 10,42" fill="rgba(107,79,255,0.35)"/>
    <polygon points="16,42 22,16 28,16 22,42" fill="rgba(107,79,255,0.65)"/>
    <polygon points="28,42 34,5 40,5 34,42"  fill="#6B4FFF"/>
  </g>

  <!--
    Text group x = 403 + 80 + 24 = 507
    DEXARIS centred at y = 305, subtitle centred at y = 350
  -->
  <text
    x="507"
    y="305"
    font-family="Plus Jakarta Sans, Arial, sans-serif"
    font-size="64"
    font-weight="800"
    fill="#E8E6FF"
    dominant-baseline="central"
    letter-spacing="4"
  >DEXARIS</text>

  <text
    x="510"
    y="351"
    font-family="Plus Jakarta Sans, Arial, sans-serif"
    font-size="24"
    font-weight="400"
    fill="rgba(232,230,255,0.5)"
    dominant-baseline="central"
    letter-spacing="1"
  >DeFi Yield Intelligence</text>
</svg>`;

// Write the canonical SVG source
writeFileSync(join(root, 'public/og-image.svg'), svg, 'utf8');
console.log('Wrote public/og-image.svg');

// Render to PNG via resvg-js, loading Plus Jakarta Sans woff2 directly
const resvg = new Resvg(svg, {
  fitTo: { mode: 'original' },
  font: {
    loadSystemFonts: true,          // fallback for any missing glyphs
    fontFiles: [
      join(fontDir, 'plus-jakarta-sans-latin-800-normal.woff2'),
      join(fontDir, 'plus-jakarta-sans-latin-400-normal.woff2'),
      join(fontDir, 'plus-jakarta-sans-latin-ext-800-normal.woff2'),
      join(fontDir, 'plus-jakarta-sans-latin-ext-400-normal.woff2'),
    ],
  },
});

const pngData = resvg.render();
const png = pngData.asPng();
writeFileSync(join(root, 'public/og-image.png'), png);
console.log(`Wrote public/og-image.png  (${(png.length / 1024).toFixed(1)} KB)`);
