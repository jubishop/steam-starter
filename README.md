# Steam Game Starter

Make a controller game with Codex Desktop and play it on a Steam Machine.

## Start a new game

Use this repository as a GitHub template. Give the new repository your game's name, clone it into a new folder, and open that folder in Codex Desktop.

Then say:

> I want to make a game about four robots defending a moon base. Please read the repository instructions and help me build it.

Codex will ask a few short questions, personalize the starter, create the artwork, and build the game. The framework is already selected: Three.js, TypeScript, Electron, and npm.

Use Node.js 24 or newer. Codex checks the required creator-computer tools and explains any one-time setup.

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
- GitHub Actions build validation

Detailed guidance lives in [the project skill](.agents/skills/make-steam-game/SKILL.md).
