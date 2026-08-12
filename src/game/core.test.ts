import { describe, expect, it } from "vitest";

import {
  applyStickDeadzone,
  circlesOverlap,
  clampPosition,
  normalizeVector,
  playerStartPosition,
  spawnOnArenaEdge,
} from "./core";

describe("game math", () => {
  it("normalizes movement without changing a zero vector", () => {
    expect(normalizeVector({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(normalizeVector({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("removes stick drift and rescales useful input", () => {
    expect(applyStickDeadzone(0.1, 0.1, 0.2)).toEqual({ x: 0, y: 0 });
    expect(applyStickDeadzone(1, 0, 0.2)).toEqual({ x: 1, y: 0 });
  });

  it("keeps actors inside the arena", () => {
    expect(clampPosition({ x: 30, y: -20 }, 40, 24, 2)).toEqual({
      x: 18,
      y: -10,
    });
  });

  it("detects circular collisions", () => {
    expect(circlesOverlap({ x: 0, y: 0 }, 1, { x: 1.5, y: 0 }, 1)).toBe(true);
    expect(circlesOverlap({ x: 0, y: 0 }, 1, { x: 3, y: 0 }, 1)).toBe(false);
  });

  it("spawns enemies just outside a selected arena edge", () => {
    expect(spawnOnArenaEdge(40, 24, 0, 0.25, 2)).toEqual({ x: -22, y: -6 });
    expect(spawnOnArenaEdge(40, 24, 0.75, 0.5, 2)).toEqual({ x: 0, y: 14 });
  });

  it("gives one to four local players distinct centered start positions", () => {
    expect(playerStartPosition(0, 1, 2.4)).toEqual({ x: 0, y: 0 });

    const positions = Array.from({ length: 4 }, (_, index) =>
      playerStartPosition(index, 4, 2.4),
    );
    expect(
      new Set(positions.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`)).size,
    ).toBe(4);
    for (const position of positions) {
      expect(Math.hypot(position.x, position.y)).toBeCloseTo(2.4);
    }
  });
});
