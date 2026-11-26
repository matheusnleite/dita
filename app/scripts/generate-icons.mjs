import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
fs.mkdirSync(publicDir, { recursive: true });

const glyph = `
  <rect x="212" y="96" width="88" height="188" rx="44" fill="#f5c451"/>
  <path d="M164 232a92 92 0 0 0 184 0" stroke="#f5c451" stroke-width="26" fill="none" stroke-linecap="round"/>
  <line x1="256" y1="326" x2="256" y2="396" stroke="#f5c451" stroke-width="26" stroke-linecap="round"/>
  <line x1="196" y1="404" x2="316" y2="404" stroke="#f5c451" stroke-width="26" stroke-linecap="round"/>
`;

const rounded = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0b0f14"/>
  ${glyph}
</svg>`;

const fullBleed = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b0f14"/>
  <g transform="translate(256 256) scale(0.78) translate(-256 -256)">${glyph}</g>
</svg>`;

fs.writeFileSync(path.join(publicDir, "favicon.svg"), rounded);

async function png(svg, size, name) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(publicDir, name));
}

await png(rounded, 192, "icon-192.png");
await png(rounded, 512, "icon-512.png");
await png(fullBleed, 512, "icon-512-maskable.png");
await png(rounded, 180, "apple-touch-icon.png");

console.log("ícones gerados em app/public");
