---
name: make-steam-game
description: Build and maintain a beginner-friendly Three.js, TypeScript, and Electron game from macOS or Windows for a controller-only Steam Machine. Use when the user wants to start or personalize a game from this template; add gameplay, levels, menus, multiplayer, controllers, tests, or artwork; configure SSH; package the Linux app; or deploy, update, ship, sync, or play the latest version on the Steam Machine.
---

# Make a Steam Game

Guide the creator with short, plain explanations. Make routine technical decisions for them. Ask only for choices that change their game.

## Start a game safely

1. Check the current folder, `game.config.json`, and `.starter-template`. Inspect Git only if it is available; it is optional.
2. Check the creator-computer tools in `references/setup.md`. Handle missing tools with a short explanation and parent approval before installing software.
3. If this is the source `jubishop/steam-starter` repository, do not turn it into the creator's game. Ask where to create a new folder, require a new or empty destination, and copy the starter contents there without its `.git` directory.
4. If this is a downloaded starter, confirm its folder is the local project's primary folder before personalizing it. If not, give the creator one short instruction to add or open that exact folder and start a Codex chat there.
5. Ask for the game title and a one-sentence idea first. A folder name or title alone is not a game idea: if the creator supplies only one, ask for the other before personalizing. Do not infer the design from the sample gameplay or simply relabel and deploy the sample as the creator's game. Derive a lowercase hyphenated slug. Do not ask about GitHub. Local-only is the default; a parent can request optional version control or online backup later.
6. Update `game.config.json`. Keep `appId` stable after the game has been added to Steam. Remove `.starter-template` only after the project is personalized.
7. Do not ask which framework to use. Three.js, TypeScript, Electron, Vite, Vitest, and npm are the fixed foundation.

## Build the game

- Make all menus and gameplay fully usable by controllers. A keyboard may help local development but must never be required on the Steam Machine.
- Support one to four local players. Each controller joins and controls only one player.
- Prefer directly visible physical gamepads. Use Steam Input virtual gamepads only when no physical gamepads are visible; this prevents one controller from being counted twice.
- Preserve the lobby, disconnect cleanup, pause, replay, and distinct player colors unless the game design replaces them deliberately.
- Target 1920×1080 fullscreen and 60 FPS. Keep the per-frame path allocation-light and use Three.js instancing for repeated objects.
- Put tunable gameplay and level values in `src/game/data/` rather than scattering them through rendering code.
- Keep Electron `contextIsolation`, sandboxing, and disabled Node integration.
- Store save data in Electron's user-data directory, never inside `/home/deck/Games/<game-slug>`.
- Add focused tests for input selection and pure game rules. Run `npm run check` after material changes.

## Create artwork

Read [references/artwork.md](references/artwork.md) before creating or changing the game's artwork. Base the visual direction on the creator's description and inspect every final crop.

## Set up the Steam Machine

Read [references/setup.md](references/setup.md) when SSH is not ready or this is the creator's first game on this computer. Never ask the creator to paste a password into chat. A parent-provided password is entered only into a system or terminal password prompt.

## Deploy without sending the creator to a terminal

Treat requests such as “deploy,” “update my game,” “ship it,” “put this on the Steam Machine,” and “let me play the latest version” as authorization to perform the normal deployment workflow:

1. Run `npm run check`. Fix failures caused by the current work and re-run it.
   If `.starter-template` still exists, stop and finish personalization before deploying. The sample game must not ship under a creator's title.
2. Confirm SSH with `deck@steamdeck.local`. If first-time setup is needed, follow `references/setup.md` and run `npm run setup:steam` interactively for the creator.
3. Run `npm run shipit` yourself. Do not tell the creator to type it or open a terminal for routine deployments.
4. If the script says the Steam shortcut is missing, guide the creator through the one-time Desktop Mode step in `references/setup.md`. Then run `npm run shipit` again yourself.
5. Verify the remote launcher and `app.asar` match the local package. When the shortcut exists, also verify the compact artwork and any required Steam restart.
6. Tell the creator the game is ready and what to select in Gaming Mode.

Deployment does not by itself authorize publishing source code. Use Git only when it is already configured or a parent asks for version control or online backup. Never make a child's game public by default.

Read [references/deployment.md](references/deployment.md) when changing deployment scripts, diagnosing Steam launch behavior, or adding another Steam Machine.
