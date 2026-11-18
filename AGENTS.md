# Project instructions

<!-- project-starter:begin -->
Project Starter manages this block; add project rules after it. Project rules
take precedence over this block and the foundation pages wherever they differ.

- Keep durable guidance and non-derivable context in [memory](memory/README.md),
  and designs, decisions, and research in [docs](docs/README.md). Before
  non-trivial work or writing memory, search with `bin/knowledge search "term"`
  or `bin/knowledge query "question" --no-rerank`, then read results with
  `bin/knowledge get <path> -l 80`. Markdown sources are authoritative.
- If configured QMD fails, follow `~/AGENTS.md` for a failed knowledge search,
  repairing it as
  [search failures](docs/foundation/knowledge-search.md#search-failures)
  describes.
- Follow the [engineering policy](docs/foundation/engineering-policy.md):
  fewer dependencies, red-green tests for behavior changes, cohesive files and
  pages, checkout-isolated validation, and the latest stable toolchains.
- Run [checks](docs/foundation/engineering-policy.md#checks) by change:
  `bin/check --documents-only` for text, the relevant checks while editing
  code, and `bin/check --full` before merging or releasing production code
  unless an enforced CI gate runs it. Reuse passing results.
- Keep accepted decisions separate from proposals, and keep generated caches
  out of Git. Keep secrets out of public repositories only; a private one may
  commit them.
- Run `bin/setup` after cloning, `bin/doctor` to diagnose setup, and
  `bin/qmd-index` after uncommitted knowledge edits. Managed files listed in
  `.project-starter.json` change only through Project Starter or a recorded
  override with its reason.
<!-- project-starter:end -->

## Project purpose

This repository is a controller-first Steam Machine game starter for new creators.

- Use Three.js, TypeScript, Electron, Vite, Vitest, and npm.
- Support one to four local controllers.
- Target 1920×1080 fullscreen at 60 FPS.
- Make every menu and gameplay action usable without a keyboard or mouse.
- Keep gameplay and level values in small, safely editable data files under `src/game/data/`.
- Treat the included arena, mechanics, palette, UI, and artwork as disposable examples. Every personalized game needs its own creative direction derived from the creator's idea.

## Required skill

Use the [make-steam-game skill](.agents/skills/make-steam-game/SKILL.md) to create, change, test, package, or deploy this game. When the user asks to deploy, ship, or play the latest version, run its deployment workflow for them, but while `.starter-template` remains, finish the first playable version instead of deploying the starter example. Never send the user to a terminal for routine work.

## Safety

- Never request, display, or store the Steam Machine password in chat or repository files.
- Never reuse a nonempty local folder for a new game. Deploy only to the folder derived from the current game's validated slug, `/home/deck/Games/<game-slug>` on `deck@steamdeck.local` by default.
- Keep saves outside the deployed game directory so a clean deployment cannot remove progress.

## Creator tools

Keep creator-side scripts portable across macOS and Windows with Node and
standard OpenSSH tools, and never require Git, GitHub, Python, ShellCheck,
QMD, direnv, Fish, or `rsync` to create, change, test, package, or deploy a
game; Git and GitHub are optional backups. The Project Starter tooling in the
block above is optional maintainer tooling for Git checkouts on macOS or
Linux: run `bin/setup` only there, and where it isn't configured, read the
Markdown sources instead of searching and run `npm run check` instead of
`bin/check`.
