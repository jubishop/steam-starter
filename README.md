# Steam Game Starter

Make a controller game with Codex Desktop and play it on a Steam Machine.

## Start with one message

The creator does not need Git, a GitHub account, or a copy of this repository. Open Codex Desktop and say:

> Read https://github.com/jubishop/steam-starter and help me make a new game.

Codex will ask for the game's name, what it is about, and where to keep it. It will download the starter into a new local folder and make that folder the game's local Codex project. If the app requires the creator to select the folder, Codex will give one short instruction with the exact folder already prepared.

## Bootstrap instructions for Codex

When a creator references this repository but has not downloaded it:

1. Ask for the game name, a one-sentence idea, and where to store it. Suggest `Documents\Games\<game-slug>` on Windows or `~/Games/<game-slug>` on macOS. Use only a new or empty destination folder.
2. Download `https://github.com/jubishop/steam-starter/archive/refs/heads/main.zip` to a temporary location. Extract the contents of its `steam-starter-main` folder directly into the chosen destination.
3. Do not require Git, GitHub, GitHub CLI, or a GitHub account. Do not initialize or publish a repository unless a parent later asks for that optional backup.
4. Add the destination as a local Codex project and make it the primary folder. If the current chat cannot change projects itself, stop and give the creator one short action with the exact path: add or open that folder as a local project, then start a Codex chat there. Do not continue game work in the bootstrap chat.
5. In the game project's new chat, read `AGENTS.md` and `.agents/skills/make-steam-game/SKILL.md`, then personalize and build the game there.
6. Check the local tools described in the skill's setup reference. Ask a parent before installing missing system software. Never ask for a password in chat.

The framework is already selected: Three.js, TypeScript, Electron, Vite, Vitest, and npm.

## Put it on the Steam Machine

Say:

> Deploy my game so I can play the latest version.

Codex runs the checks and `npm run shipit` for you. The creator computer can use macOS or Windows; the deployment tools do not require Fish or `rsync`. The first game needs one short visit to Desktop Mode so Steam can add it as a Non-Steam Game. Later updates happen over SSH without Desktop Mode or terminal commands.

The first computer setup needs a parent to enter the Steam Machine password once. Enter it only into the password prompt; never put it in chat.

## Included foundation

- One to four local controllers with Steam Input duplicate protection
- Controller-only lobby, pause, replay, and gameplay
- 1080p fullscreen Electron wrapper
- Three.js arena example and data-driven tuning
- Automated tests, Linux packaging, Steam artwork, and SSH deployment
- Portable Node-based creator tools for macOS and Windows
- Optional Git and GitHub backup, never a prerequisite
- GitHub Actions validation for copies that are later published

Detailed guidance lives in [the project skill](.agents/skills/make-steam-game/SKILL.md).
