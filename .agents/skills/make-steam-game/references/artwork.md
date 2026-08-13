# Steam artwork

Replace the starter artwork with one cohesive, original master illustration from the creator's game idea. The included images are placeholders and must not influence the new game's palette, composition, characters, or logo. Use image generation when available. Do not imitate protected characters, logos, or a named game's distinctive art.

Keep the important subject inside the center 60–65 percent so portrait and wide crops remain useful. Create the wordmark separately so text is exact and can have transparency.

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
2. Run `npm run art:build` to create each crop and the title logo. The Node script works on macOS and Windows.
3. Make the compact JPG readable at 32×32. Prefer a bold face, symbol, or central silhouette over a detailed full scene.
4. Render the exact game title as the transparent logo with generous side padding. Check its nontransparent bounding box so no letters are clipped.
5. Run `npm run art:check`.
6. Visually inspect every output, including a temporary 32×32 compact-icon preview.

The deploy script renames these assets using Steam's discovered shortcut ID. Do not hardcode that numeric ID into the repository.
