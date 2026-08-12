import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(projectRoot, "assets");
const master = resolve(assets, "master-art.png");
const game = JSON.parse(await readFile(resolve(projectRoot, "game.config.json"), "utf8"));

await mkdir(assets, { recursive: true });

async function cover(filename, width, height, format = "png") {
  const image = sharp(master).resize(width, height, {
    fit: "cover",
    position: "centre",
  });
  if (format === "jpeg") {
    await image.jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(resolve(assets, filename));
  } else {
    await image.png().toFile(resolve(assets, filename));
  }
}

await Promise.all([
  cover("icon.png", 1024, 1024),
  cover("steam-icon.jpg", 184, 184, "jpeg"),
  cover("steam-grid-portrait.png", 600, 900),
  cover("steam-grid-landscape.png", 920, 430),
  cover("steam-hero.png", 3840, 1240),
]);

const title = String(game.title).toUpperCase();
const escapedTitle = title
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");
const fontSize = Math.max(70, Math.min(170, Math.floor(1800 / Math.max(title.length, 1))));
const logo = `
  <svg width="1280" height="360" xmlns="http://www.w3.org/2000/svg">
    <text x="640" y="230" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" font-style="italic"
      letter-spacing="-3" fill="#f5fbff" stroke="#062847" stroke-width="12"
      paint-order="stroke fill">${escapedTitle}</text>
    <text x="640" y="230" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" font-style="italic"
      letter-spacing="-3" fill="none" stroke="#29d9ff" stroke-width="2">${escapedTitle}</text>
  </svg>`;

await sharp(Buffer.from(logo)).png().toFile(resolve(assets, "steam-logo.png"));
console.log("Steam artwork was built from assets/master-art.png and game.config.json.");
