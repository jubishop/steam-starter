import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LOGO_HEIGHT, LOGO_WIDTH, fitLogo, iconSource, logoProblem, opaqueBounds } from "./artwork.mjs";

function svg(width, height, shapes) {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`,
  );
}

async function boundsOf(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { bounds: opaqueBounds(data, info), info };
}

describe("opaqueBounds", () => {
  it("finds the box of pixels with any alpha", () => {
    const width = 4;
    const height = 3;
    const data = new Uint8Array(width * height * 4);
    data[(1 * width + 1) * 4 + 3] = 255;
    data[(2 * width + 2) * 4 + 3] = 1;

    expect(opaqueBounds(data, { width, height, channels: 4 })).toEqual({
      left: 1,
      top: 1,
      width: 2,
      height: 2,
    });
  });

  it("returns null for a fully transparent image", () => {
    expect(opaqueBounds(new Uint8Array(2 * 2 * 4), { width: 2, height: 2, channels: 4 })).toBeNull();
  });
});

describe("fitLogo", () => {
  it("fits a wordmark wider than the logo inside its padding", async () => {
    const logo = await fitLogo(svg(6000, 400, '<rect x="100" y="100" width="5800" height="200" fill="#fff"/>'));
    const { bounds, info } = await boundsOf(logo);

    expect([info.width, info.height]).toEqual([LOGO_WIDTH, LOGO_HEIGHT]);
    expect(bounds.left).toBeGreaterThanOrEqual(64);
    expect(LOGO_WIDTH - bounds.left - bounds.width).toBeGreaterThanOrEqual(64);
    expect(await logoProblem(logo)).toBeNull();
  });

  it("centers a small wordmark without enlarging it", async () => {
    const logo = await fitLogo(svg(800, 400, '<rect x="10" y="300" width="200" height="50" fill="#fff"/>'));
    const { bounds } = await boundsOf(logo);

    expect(bounds).toEqual({ left: 540, top: 155, width: 200, height: 50 });
  });

  it("rejects a wordmark the render canvas clipped", async () => {
    await expect(fitLogo(svg(400, 200, '<rect x="0" y="50" width="300" height="100" fill="#fff"/>'))).rejects.toThrow(
      "touches the left edge",
    );
  });

  it("rejects a wordmark with nothing visible", async () => {
    await expect(fitLogo(svg(400, 200, ""))).rejects.toThrow("nothing visible");
  });
});

describe("logoProblem", () => {
  it("flags a logo whose letters reach its edges", async () => {
    const clipped = await sharp(
      svg(LOGO_WIDTH, LOGO_HEIGHT, `<rect x="0" y="120" width="${LOGO_WIDTH}" height="120" fill="#fff"/>`),
    ).png().toBuffer();

    expect(await logoProblem(clipped)).toMatch(/left and right edges/u);
  });

  it("flags a fully transparent logo", async () => {
    const empty = await sharp(svg(LOGO_WIDTH, LOGO_HEIGHT, "")).png().toBuffer();

    expect(await logoProblem(empty)).toMatch(/nothing visible/u);
  });
});

describe("iconSource", () => {
  let assets;

  beforeEach(async () => {
    assets = await mkdtemp(join(tmpdir(), "steam-icon-source-"));
  });

  afterEach(async () => {
    await rm(assets, { recursive: true, force: true });
  });

  it("uses dedicated icon art when present", async () => {
    await writeFile(join(assets, "icon-art.png"), "");

    expect(await iconSource(assets)).toBe(join(assets, "icon-art.png"));
  });

  it("falls back to the master art", async () => {
    expect(await iconSource(assets)).toBe(join(assets, "master-art.png"));
  });
});
