# Deployment design

`npm run shipit` validates the game and runs the Node deployment script. The same command works from Codex on macOS and Windows. It invokes the current npm CLI through Node, avoiding Windows `.cmd` process-launch failures, and uses the operating system's standard `ssh`, `scp`, and `tar` commands; it does not need Fish or `rsync`.

The deployment:

1. Reads the title, stable application ID, and slug from `game.config.json`.
2. Builds a Linux x64 Electron directory package.
   On Windows, if security software briefly locks electron-builder's extracted staging folder, the deployer validates and caches that exact Electron version, then retries from the unpacked distribution.
3. Installs a wrapper that removes Steam's `LD_PRELOAD` only for Electron, avoiding Chromium zygote crashes while keeping the Electron sandbox enabled.
4. Uploads one archive, expands it into a staging directory, and replaces only `/home/deck/Games/<game-slug>`. It restores the previous directory if activation fails.
5. Installs and validates a Desktop launcher.
6. Finds the matching Non-Steam shortcut by its exact executable path.
7. Installs portrait, landscape, hero, logo, and compact-icon artwork under Steam's numeric shortcut ID.
8. Stops Steam before editing `shortcuts.vdf`, creates a backup, writes only the matching icon field, and restarts Steam.

Safeguards:

- Validate the slug, remote user, remote directory, Steam grid path, and shortcut ID before writes.
- Never place saves in the deployed directory.
- Preserve unrelated shortcuts and Steam artwork.
- If a command fails after Steam stops, restart the Steam user service before reporting failure.
- After deployment, compare hashes for the wrapper and `resources/app.asar`. When a shortcut exists, also verify the compact icon and confirm an initially active `steam-launcher.service` restarted.
- Treat the first missing shortcut as an expected setup state, not a build failure.
