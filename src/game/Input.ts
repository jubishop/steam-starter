import { applyStickDeadzone, normalizeVector, type Vec2 } from "./core";

export interface PlayerControls {
  aim: Vec2;
  backPressed: boolean;
  confirmPressed: boolean;
  move: Vec2;
  shoot: boolean;
  sourceId: string;
  startPressed: boolean;
}

export interface InputFrame {
  connectedControllerCount: number;
  players: PlayerControls[];
}

const GAME_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Backspace",
  "Enter",
  "Escape",
  "KeyA",
  "KeyD",
  "KeyI",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyS",
  "KeyW",
  "Space",
]);

const STEAM_INPUT_VIRTUAL_GAMEPAD =
  /\bVendor:\s*28de\b.*\bProduct:\s*11ff\b/i;

function isSteamInputVirtualGamepad(gamepad: Gamepad): boolean {
  return STEAM_INPUT_VIRTUAL_GAMEPAD.test(gamepad.id);
}

export function selectConnectedGamepads(
  gamepads: readonly (Gamepad | null)[],
): Gamepad[] {
  const connectedGamepads = gamepads.filter(
    (gamepad): gamepad is Gamepad => gamepad?.connected === true,
  );
  const steamInputGamepads = connectedGamepads.filter(
    isSteamInputVirtualGamepad,
  );
  const physicalGamepads = connectedGamepads.filter(
    (gamepad) => !isSteamInputVirtualGamepad(gamepad),
  );
  return physicalGamepads.length > 0
    ? physicalGamepads
    : steamInputGamepads;
}

export class Input {
  private readonly heldKeys = new Set<string>();
  private readonly pressedKeys = new Set<string>();
  private readonly previousButtons = new Map<string, readonly boolean[]>();

  constructor(private readonly keyboardEnabled: boolean) {
    if (keyboardEnabled) {
      window.addEventListener("keydown", this.handleKeyDown);
      window.addEventListener("keyup", this.handleKeyUp);
      window.addEventListener("blur", this.clearKeyboard);
    }
  }

  read(): InputFrame {
    const players: PlayerControls[] = [];
    const activeSources = new Set<string>();
    const gamepads = selectConnectedGamepads(navigator.getGamepads?.() ?? []);

    for (const [playerNumber, gamepad] of gamepads.entries()) {
      const controls = this.readGamepad(gamepad, playerNumber);
      players.push(controls);
      activeSources.add(controls.sourceId);
    }

    if (this.keyboardEnabled) {
      players.push(this.readKeyboard());
      activeSources.add("keyboard");
    }

    for (const sourceId of this.previousButtons.keys()) {
      if (!activeSources.has(sourceId)) {
        this.previousButtons.delete(sourceId);
      }
    }
    this.pressedKeys.clear();

    return { connectedControllerCount: gamepads.length, players };
  }

  private readGamepad(gamepad: Gamepad, playerNumber: number): PlayerControls {
    const sourceId = `gamepad-${playerNumber}`;
    const currentButtons = gamepad.buttons.map((button) => button.pressed);
    const previousButtons = this.previousButtons.get(sourceId) ?? [];
    const buttonPressed = (buttonIndex: number): boolean =>
      (currentButtons[buttonIndex] ?? false) &&
      !(previousButtons[buttonIndex] ?? false);

    const controls: PlayerControls = {
      aim: applyStickDeadzone(
        gamepad.axes[2] ?? 0,
        gamepad.axes[3] ?? 0,
        0.2,
      ),
      backPressed: buttonPressed(1),
      confirmPressed: buttonPressed(0),
      move: applyStickDeadzone(
        gamepad.axes[0] ?? 0,
        gamepad.axes[1] ?? 0,
        0.18,
      ),
      shoot:
        (gamepad.buttons[0]?.pressed ?? false) ||
        (gamepad.buttons[7]?.value ?? 0) > 0.35,
      sourceId,
      startPressed: buttonPressed(9),
    };

    this.previousButtons.set(sourceId, currentButtons);
    return controls;
  }

  private readKeyboard(): PlayerControls {
    return {
      aim: normalizeVector({
        x:
          Number(this.heldKeys.has("ArrowRight") || this.heldKeys.has("KeyL")) -
          Number(this.heldKeys.has("ArrowLeft") || this.heldKeys.has("KeyJ")),
        y:
          Number(this.heldKeys.has("ArrowDown") || this.heldKeys.has("KeyK")) -
          Number(this.heldKeys.has("ArrowUp") || this.heldKeys.has("KeyI")),
      }),
      backPressed: this.pressedKeys.has("Backspace"),
      confirmPressed: this.pressedKeys.has("Enter"),
      move: normalizeVector({
        x: Number(this.heldKeys.has("KeyD")) - Number(this.heldKeys.has("KeyA")),
        y: Number(this.heldKeys.has("KeyS")) - Number(this.heldKeys.has("KeyW")),
      }),
      shoot: this.heldKeys.has("Space"),
      sourceId: "keyboard",
      startPressed: this.pressedKeys.has("Enter") || this.pressedKeys.has("Escape"),
    };
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat && !this.heldKeys.has(event.code)) {
      this.pressedKeys.add(event.code);
    }
    this.heldKeys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (GAME_KEYS.has(event.code)) {
      event.preventDefault();
    }
    this.heldKeys.delete(event.code);
  };

  private readonly clearKeyboard = (): void => {
    this.heldKeys.clear();
    this.pressedKeys.clear();
  };
}
