import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specs = [
  ["icon.png", 1024, 1024],
  ["steam-icon.jpg", 184, 184],
  ["steam-grid-portrait.png", 600, 900],
  ["steam-grid-landscape.png", 920, 430],
  ["steam-hero.png", 3840, 1240],
  ["steam-logo.png", 1280, 360],
];

for (const [filename, width, height] of specs) {
  const path = resolve(projectRoot, "assets", filename);
  const metadata = await sharp(await readFile(path)).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`${filename} must be ${width}x${height}, not ${metadata.width}x${metadata.height}.`);
  }
  if (filename === "steam-logo.png" && !metadata.hasAlpha) {
    throw new Error("steam-logo.png must have a transparent alpha channel.");
  }
}

console.log("Steam artwork dimensions and logo transparency are valid.");
