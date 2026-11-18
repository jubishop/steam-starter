---
name: make-steam-game
description: Build and maintain a beginner-friendly Three.js, TypeScript, and Electron game from macOS or Windows for a controller-only Steam Machine. Use when the user wants to start or personalize a game from this template; add gameplay, levels, menus, multiplayer, controllers, tests, or artwork; configure SSH; package the Linux app; or deploy, update, ship, sync, or play the latest version on the Steam Machine.
---

# Make a Steam Game

Guide the creator with short, plain explanations. Make routine technical decisions for them. Ask only for choices that change their game.

## Start a game safely

1. Check the current folder, `game.config.json`, `.starter-template`, and `.agents/game-brief.md` when present.
2. Make sure `node` 24 or newer, `npm`, `ssh`, `scp`, and `tar` run. macOS and current Windows include the SSH and archive tools; on Windows 11 they come from the **OpenSSH Client** optional feature. If one is missing, explain its purpose in one sentence and ask a parent before installing it: prefer `winget` on Windows, and the creator's existing package manager or the official installer on macOS. Verify each installed command before continuing.
3. If this is the source `jubishop/steam-starter` repository, do not turn it into the creator's game. Ask where to create the game's new folder and copy the starter contents there without its `.git` directory.
4. If this is a downloaded starter, confirm its folder is the local project's primary folder before personalizing it. If not, give the creator one short instruction to add or open that exact folder and start a new chat there.
5. Take the title and one-sentence idea from `.agents/game-brief.md` when it exists; otherwise ask for whichever is missing, since a folder name or title alone is not a game idea. Derive the slug yourself.
6. Don't raise Git or GitHub. Keep the game local, use Git only when it is already configured or a parent asks for version control or online backup, and never make a child's game public by default.
7. Update `game.config.json`, keeping `appId` stable once the game has been added to Steam. Remove `.starter-template` and the game brief only after the personalization checks in the creative-slate reference pass.

## Create from a clean creative slate

Read [references/creative-slate.md](references/creative-slate.md) before personalizing gameplay, visuals, UI, or artwork.

## Build the game

- Each controller joins and controls only one player.
- Prefer directly visible physical gamepads. Use Steam Input virtual gamepads only when no physical gamepads are visible; this prevents one controller from being counted twice.
- Preserve the lobby, disconnect cleanup, pause, replay, and distinct player colors unless the game design replaces them deliberately.
- Keep the per-frame path allocation-light and use Three.js instancing for repeated objects.
- Keep Electron `contextIsolation`, sandboxing, and disabled Node integration.
- Store save data in Electron's user-data directory.
- Add focused tests for input selection and pure game rules. Run `npm run check` after material changes.
- Finish and validate the smallest playable version of the creator's requested core loop and creative direction before offering deployment.

## Create artwork

Read [references/artwork.md](references/artwork.md) before creating or changing the game's artwork.

## Set up the Steam Machine

Before discussing setup, probe noninteractive SSH key authentication to `deck@steamdeck.local` with a short timeout; `npm run shipit` probes the same way and reports which case applies.

- **Key accepted:** SSH setup is complete, so don't mention passwords or computer trust.
- **No answer:** ask the creator to power on or wake the Steam Machine, then retry. Propose the one-time `sshd` activation in [references/setup.md](references/setup.md) only after they confirm it is definitely on and on the same network but port 22 still doesn't answer.
- **Port 22 answers but rejects the key:** perform only setup.md's computer-trust step.
- **Shortcut missing:** guide the creator through setup.md's one-time Non-Steam Game step.

## Deploy without sending the creator to a terminal

Run `npm run shipit` yourself. It runs `npm run check`, refuses the starter example, probes SSH, deploys, and verifies the deployed files and Steam restart. Fix check failures from the current work, handle setup states as the section above says, and rerun it until it succeeds with the Steam shortcut found. Then tell the creator the game is ready and what to select in Gaming Mode.

Read [references/deployment.md](references/deployment.md) when changing deployment scripts, diagnosing Steam launch behavior, or adding another Steam Machine.
