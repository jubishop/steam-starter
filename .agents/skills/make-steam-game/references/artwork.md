# Steam artwork

Replace the starter artwork with one cohesive, original master illustration from the creator's game idea. The included images are placeholders and must not influence the new game's palette, composition, characters, or logo. Use image generation when available. Do not imitate protected characters, logos, or a named game's distinctive art.

Keep the important subject inside the center 60–65 percent so portrait and wide crops remain useful.

Required files:

| File | Size | Purpose |
| --- | ---: | --- |
| `assets/icon.png` | 1024×1024 PNG | Electron and Desktop launcher |
| `assets/steam-icon.jpg` | 184×184 JPG | Small Steam list and side-menu icon |
| `assets/steam-grid-portrait.png` | 600×900 PNG | Portrait library cover |
| `assets/steam-grid-landscape.png` | 920×430 PNG | Landscape library cover |
| `assets/steam-hero.png` | 3840×1240 PNG | Library hero background |
| `assets/steam-logo.png` | 1280×360 PNG with alpha | Logo over the hero |

Workflow:

1. Generate and inspect `assets/master-art.png` without text.
2. Restyle the placeholder wordmark in `logoSvg` in `scripts/build-artwork.mjs` to suit the game.
3. Run `npm run art:build` to create each crop and fit the exact title into the transparent logo.
4. Make the compact icon readable at 32×32. Prefer a bold face, symbol, or central silhouette over a detailed full scene. If the master art's center crop isn't readable, save a square `assets/icon-art.png` and rerun `art:build`, which then crops both icons from it. Don't edit the icons directly, since every rerun overwrites them.
5. Run `npm run art:check`.
6. Visually inspect every output, including the 32×32 compact-icon preview `art:build` writes to `release/steam-icon-32.png`.

The deploy script renames these assets using Steam's discovered shortcut ID. Do not hardcode that numeric ID into the repository.
