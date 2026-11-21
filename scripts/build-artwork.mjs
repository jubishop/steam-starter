import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { fitLogo, iconSource } from "./lib/artwork.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assets = resolve(projectRoot, "assets");
const master = resolve(assets, "master-art.png");
const icon = await iconSource(assets);
const iconPreview = resolve(projectRoot, "release", "steam-icon-32.png");
const game = JSON.parse(await readFile(resolve(projectRoot, "game.config.json"), "utf8"));

await mkdir(assets, { recursive: true });
await mkdir(dirname(iconPreview), { recursive: true });

async function cover(source, filename, width, height, format = "png") {
  const image = sharp(source).resize(width, height, {
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
  cover(icon, "icon.png", 1024, 1024),
  cover(icon, "steam-icon.jpg", 184, 184, "jpeg"),
  cover(master, "steam-grid-portrait.png", 600, 900),
  cover(master, "steam-grid-landscape.png", 920, 430),
  cover(master, "steam-hero.png", 3840, 1240),
]);
// A 32×32 preview for checking that the compact icon stays readable at list size.
await sharp(resolve(assets, "steam-icon.jpg")).resize(32, 32).png().toFile(iconPreview);

// The starter's placeholder wordmark: restyle it for each game. The canvas only
// needs room for every letter; fitLogo trims and fits it into the Steam logo.
function logoSvg(gameTitle) {
  const title = String(gameTitle)
    .toUpperCase()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  const fontSize = 170;
  const width = Math.ceil(fontSize * (1.25 * String(gameTitle).length + 2));
  const height = fontSize * 2;
  const text = `x="${width / 2}" y="${fontSize * 1.4}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" font-style="italic"
      letter-spacing="-3"`;
  return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text ${text} fill="#f5fbff" stroke="#062847" stroke-width="12" paint-order="stroke fill">${title}</text>
    <text ${text} fill="none" stroke="#29d9ff" stroke-width="2">${title}</text>
  </svg>`;
}

await writeFile(resolve(assets, "steam-logo.png"), await fitLogo(Buffer.from(logoSvg(game.title))));
const iconNote = icon === master ? "" : `, with both icons from ${relative(projectRoot, icon)}`;
console.log(`Steam artwork was built from assets/master-art.png and game.config.json${iconNote}.`);
console.log(`Inspect the compact icon at 32×32 in ${relative(projectRoot, iconPreview)}.`);
