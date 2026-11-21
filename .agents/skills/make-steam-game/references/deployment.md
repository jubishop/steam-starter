# Deployment design

`npm run shipit` runs `npm run check`, then the Node deployment script, which invokes the current npm CLI through Node to avoid Windows `.cmd` process-launch failures.

For another Steam Machine, `STEAM_MACHINE_HOST` and `STEAM_MACHINE_USER` override the `deck@steamdeck.local` default in `npm run status:steam`, `npm run setup:steam`, and the deployment, and `STEAM_MACHINE_TARGET` overrides the deployment's `/home/<user>/Games/<game-slug>` folder.

The deployment:

1. Reads the title, stable application ID, and slug from `game.config.json`.
2. Builds a Linux x64 Electron directory package.
   On Windows, if security software briefly locks electron-builder's extracted staging folder, the deployer validates and caches that exact Electron version, then retries from the unpacked distribution.
3. Installs a wrapper that removes Steam's `LD_PRELOAD` only for Electron, avoiding Chromium zygote crashes while keeping the Electron sandbox enabled.
4. Uploads one archive, expands it into a staging directory, and replaces only the target folder. It restores the previous directory if activation fails.
5. Installs and validates a Desktop launcher.
6. Finds the matching Non-Steam shortcut by its exact executable path.
7. Installs portrait, landscape, hero, logo, and compact-icon artwork under Steam's numeric shortcut ID.
8. Stops an active `steam-launcher.service` before editing `shortcuts.vdf`, keeps a one-time backup, writes only the matching icon field, and restarts the service.

Safeguards:

- Validate the slug, remote user, remote directory, Steam grid path, and shortcut ID before writes.
- Preserve unrelated shortcuts and Steam artwork.
- If a command fails after Steam stops, restart the Steam user service before reporting failure.
- After deployment, compare hashes for the wrapper and `resources/app.asar`. When a shortcut exists, also verify the compact icon and confirm an initially active `steam-launcher.service` restarted.
- Treat the first missing shortcut as an expected setup state, not a build failure.
