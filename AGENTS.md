## Project purpose

This repository is a controller-first Steam Machine game starter for new creators.

- Use Three.js, TypeScript, Electron, Vite, Vitest, and npm.
- Support one to four local controllers.
- Target 1920×1080 fullscreen at 60 FPS.
- Make every menu and gameplay action usable without a keyboard or mouse.
- Keep gameplay and level values in small data files that Codex can edit safely.

## Required skill

Use `.agents/skills/make-steam-game/SKILL.md` when the user wants to create, change, test, package, deploy, update, or play the latest version of this game on the Steam Machine.

When the user asks to deploy, update the Steam Machine, ship the game, run `shipit`, or play the latest version, validate the game and run `npm run shipit` for them. Do not tell the user to open a terminal for routine work.

## Safety

- The Steam Machine defaults are `deck@steamdeck.local` and `/home/deck/Games/<game-slug>`.
- Never request, display, or store the Steam Machine password in chat or repository files.
- Never reuse a nonempty local folder for a new game. Deploy only to the remote directory derived from the current game's validated slug.
- Keep saves outside the deployed game directory so a clean deployment cannot remove progress.
- Keep creator-side scripts portable across macOS and Windows. Use Node and standard OpenSSH tools; do not require Fish or `rsync`.
