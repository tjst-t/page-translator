import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const SIZES = [16, 48, 128];
const OUTPUT_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../assets/icons",
);
const BG_COLOR = "#4285F4";
const TEXT_COLOR = "#FFFFFF";

async function generateIcon(size: number): Promise<void> {
  const fontSize = Math.round(size * 0.7);
  const yOffset = Math.round(size * 0.75);
  const xOffset = Math.round(size * 0.5);

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${BG_COLOR}"/>
    <text x="${xOffset}" y="${yOffset}" font-family="Arial, sans-serif" font-weight="bold"
          font-size="${fontSize}" fill="${TEXT_COLOR}" text-anchor="middle">T</text>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(path.join(OUTPUT_DIR, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await Promise.all(SIZES.map(generateIcon));
  console.log("All icons generated.");
}

main();
