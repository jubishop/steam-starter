# Clean creative slate

The starter demonstrates working controller, game-state, rendering, packaging, and deployment systems. Its game design and visual identity are disposable. Do not produce a lightly renamed or recolored version of the sample arena.

## Establish the new direction first

Before changing sample content, derive a compact creative direction solely from the creator's title and one-sentence idea. Make routine choices without adding a questionnaire. Decide:

- the player fantasy and core verb;
- the visual mood, palette, lighting, and material language;
- distinctive player, enemy, weapon, and environment silhouettes;
- the camera and arena presentation that best serve the idea;
- the UI tone, typography, terminology, and feedback style.

Use those decisions as acceptance criteria. Similarities to the sample should come from the creator's idea, not from convenience.

## Keep infrastructure, replace identity

Preserve useful infrastructure such as controller discovery, one-to-four-player ownership, fixed-step timing, lobby/pause/replay flow, Electron security, packaging, and deployment. Reuse pure helpers only when they suit the new rules.

Replace or deliberately redesign all sample-specific content:

- scene composition, arena treatment, camera choices, lighting, geometry, materials, effects, and animation;
- player and enemy forms, movement, attacks, damage rules, progression, scoring, and tuning;
- HUD layout, palette, typography, labels, title treatment, and menu copy;
- sample data in `src/game/data/` and sample-specific logic or tests;
- every image in `assets/`, following `artwork.md`.

Do not preserve a sample feature merely because it already works. In particular, the example arena, projectile weapon, wave structure, geometric characters, dark red presentation, and arcade HUD are not defaults for the new game.

## Verify personalization

Before removing `.starter-template`, confirm that:

1. The requested core loop is actually playable.
2. A screenshot would not be mistaken for the starter with a different title.
3. No visible starter title, credit, UI phrase, palette, or placeholder artwork remains.
4. Unused sample mechanics, data, and tests have been removed or rewritten.
5. `npm run check` passes.
