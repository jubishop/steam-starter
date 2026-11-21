import { access } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

export const LOGO_WIDTH = 1280;
export const LOGO_HEIGHT = 360;
const LOGO_PADDING_X = 64;
const LOGO_PADDING_Y = 40;
const LOGO_MIN_MARGIN = 16;

// The box of pixels with any alpha in raw pixel data whose last channel is alpha, or null.
export function opaqueBounds(data, { width, height, channels }) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + channels - 1] > 0) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function sidesWithin(bounds, width, height, margin) {
  const gaps = {
    left: bounds.left,
    right: width - bounds.left - bounds.width,
    top: bounds.top,
    bottom: height - bounds.top - bounds.height,
  };
  return Object.keys(gaps).filter((side) => gaps[side] < margin);
}

function describeSides(sides) {
  return `${sides.join(" and ")} edge${sides.length > 1 ? "s" : ""}`;
}

async function rawWithAlpha(image) {
  return sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

// Trims a rendered wordmark, such as an SVG of the title, and centers it inside
// the Steam logo's padding, shrinking it when needed so no letter is clipped.
export async function fitLogo(image) {
  const { data, info } = await rawWithAlpha(image);
  const bounds = opaqueBounds(data, info);
  if (!bounds) {
    throw new Error("The title wordmark rendered nothing visible.");
  }
  const clipped = sidesWithin(bounds, info.width, info.height, 1);
  if (clipped.length > 0) {
    throw new Error(`The title wordmark touches the ${describeSides(clipped)} of its canvas; widen the canvas.`);
  }

  const raw = { width: info.width, height: info.height, channels: info.channels };
  const fitted = await sharp(data, { raw })
    .extract(bounds)
    .resize(LOGO_WIDTH - 2 * LOGO_PADDING_X, LOGO_HEIGHT - 2 * LOGO_PADDING_Y, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  return sharp({
    create: { width: LOGO_WIDTH, height: LOGO_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: fitted.data,
        left: Math.round((LOGO_WIDTH - fitted.info.width) / 2),
        top: Math.round((LOGO_HEIGHT - fitted.info.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

// Explains why a Steam logo image looks clipped or empty, or returns null.
export async function logoProblem(image) {
  const { data, info } = await rawWithAlpha(image);
  const bounds = opaqueBounds(data, info);
  if (!bounds) {
    return "steam-logo.png shows nothing visible.";
  }
  const tight = sidesWithin(bounds, info.width, info.height, LOGO_MIN_MARGIN);
  if (tight.length > 0) {
    return `steam-logo.png reaches within ${LOGO_MIN_MARGIN}px of its ${describeSides(tight)}, so letters may be clipped.`;
  }
  return null;
}

// The image both icons are cropped from: a dedicated assets/icon-art.png when
// the game has one, so reruns keep a readable compact icon, else the master art.
export async function iconSource(assets) {
  const iconArt = resolve(assets, "icon-art.png");
  try {
    await access(iconArt);
    return iconArt;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return resolve(assets, "master-art.png");
  }
}
