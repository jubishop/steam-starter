export interface Vec2 {
  x: number;
  y: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeVector(value: Vec2): Vec2 {
  const magnitude = Math.hypot(value.x, value.y);
  if (magnitude <= Number.EPSILON) {
    return { x: 0, y: 0 };
  }

  return { x: value.x / magnitude, y: value.y / magnitude };
}

export function applyStickDeadzone(
  x: number,
  y: number,
  deadzone: number,
): Vec2 {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) {
    return { x: 0, y: 0 };
  }

  const usefulMagnitude = clamp(
    (magnitude - deadzone) / (1 - deadzone),
    0,
    1,
  );

  return {
    x: (x / magnitude) * usefulMagnitude,
    y: (y / magnitude) * usefulMagnitude,
  };
}

export function clampPosition(
  position: Vec2,
  arenaWidth: number,
  arenaHeight: number,
  radius: number,
): Vec2 {
  return {
    x: clamp(position.x, -arenaWidth / 2 + radius, arenaWidth / 2 - radius),
    y: clamp(position.y, -arenaHeight / 2 + radius, arenaHeight / 2 - radius),
  };
}

export function circlesOverlap(
  firstPosition: Vec2,
  firstRadius: number,
  secondPosition: Vec2,
  secondRadius: number,
): boolean {
  const xDistance = firstPosition.x - secondPosition.x;
  const yDistance = firstPosition.y - secondPosition.y;
  const combinedRadius = firstRadius + secondRadius;
  return xDistance * xDistance + yDistance * yDistance <= combinedRadius ** 2;
}

export function spawnOnArenaEdge(
  arenaWidth: number,
  arenaHeight: number,
  edgeRoll: number,
  offsetRoll: number,
  padding: number,
): Vec2 {
  const edge = Math.min(3, Math.floor(clamp(edgeRoll, 0, 1) * 4));
  const horizontalOffset = -arenaWidth / 2 + clamp(offsetRoll, 0, 1) * arenaWidth;
  const verticalOffset = -arenaHeight / 2 + clamp(offsetRoll, 0, 1) * arenaHeight;

  switch (edge) {
    case 0:
      return { x: -arenaWidth / 2 - padding, y: verticalOffset };
    case 1:
      return { x: arenaWidth / 2 + padding, y: verticalOffset };
    case 2:
      return { x: horizontalOffset, y: -arenaHeight / 2 - padding };
    default:
      return { x: horizontalOffset, y: arenaHeight / 2 + padding };
  }
}

export function playerStartPosition(
  playerIndex: number,
  playerCount: number,
  spacing: number,
): Vec2 {
  if (playerCount <= 1) {
    return { x: 0, y: 0 };
  }

  const angle = -Math.PI / 2 + (playerIndex / playerCount) * Math.PI * 2;
  return {
    x: Math.cos(angle) * spacing,
    y: Math.sin(angle) * spacing,
  };
}
