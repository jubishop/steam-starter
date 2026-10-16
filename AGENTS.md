# Project instructions

<!-- project-starter:begin -->
Project Starter manages this block; add project rules after it. Project rules
take precedence over this block and the foundation pages wherever they differ.

- Keep durable guidance and non-derivable context in [memory](memory/README.md),
  and designs, decisions, and research in [docs](docs/README.md). Before
  non-trivial work or writing memory, search with `bin/knowledge search "term"`
  or `bin/knowledge query "question" --no-rerank`, then read results with
  `bin/knowledge get <path> -l 80`. Markdown sources are authoritative.
- If configured QMD fails, tell the user immediately and attempt repair. If
  repair fails, pause knowledge-dependent work until the user approves a
  fallback; never silently substitute `rg` or direct reads. See
  [search failures](docs/foundation/knowledge-search.md#search-failures).
- Use td for work with multiple stages, interruptions, blockers, or handoffs;
  run `td usage --new-session -q` once per new context and keep handoffs
  current. See [task tracking](docs/foundation/task-tracking.md).
- Follow the [engineering policy](docs/foundation/engineering-policy.md):
  fewer dependencies, red-green tests for behavior changes, cohesive files and
  pages, checkout-isolated validation, and the latest stable toolchains.
- Commit [changes outside the runtime](docs/foundation/engineering-policy.md#changes-outside-the-runtime),
  such as Markdown, AI skills, tests, CI, and tooling, directly on the default
  branch and push them without checks or a pull request.
- For code the application runs, run
  [checks](docs/foundation/engineering-policy.md#checks) by change: the
  relevant application checks while editing, and `bin/check --full` before
  merge or release unless an enforced CI gate runs it. Reuse passing results.
- Keep accepted decisions separate from proposals, preserve unrelated changes,
  and keep secrets and generated caches out of Git.
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
- Keep gameplay and level values in small data files that Codex can edit safely.
- Treat the included arena, mechanics, palette, UI, and artwork as disposable examples. Every personalized game needs its own creative direction derived from the creator's idea.

## Required skill

Use `.agents/skills/make-steam-game/SKILL.md` when the user wants to create, change, test, package, deploy, update, or play the latest version of this game on the Steam Machine.

When the user asks to deploy, update the Steam Machine, ship the game, run `shipit`, or play the latest version, first confirm this is the personalized game project and `.starter-template` is gone. If the marker remains, finish the first playable version instead of deploying the starter example. Otherwise, validate the game and run `npm run shipit` for them. Do not tell the user to open a terminal for routine work.

## Safety

- The Steam Machine defaults are `deck@steamdeck.local` and `/home/deck/Games/<game-slug>`.
- Never request, display, or store the Steam Machine password in chat or repository files.
- Never reuse a nonempty local folder for a new game. Deploy only to the remote directory derived from the current game's validated slug.
- Keep saves outside the deployed game directory so a clean deployment cannot remove progress.
- Keep creator-side scripts portable across macOS and Windows. Use Node and standard OpenSSH tools; do not require Fish or `rsync`.
- Treat Git and GitHub as optional backup tools. They must not block creating, changing, or deploying a game.

## Project foundation

The Project Starter tooling in the block above is optional maintainer tooling
for a Git checkout on macOS or Linux; game creators keep the Node-only
macOS/Windows workflow. Do not require Git, Python, ShellCheck, QMD, direnv,
or td to create, test, package, or deploy a game. Search knowledge when QMD
is configured, and run `bin/setup` only for maintainer checkouts. When these
tools are not configured, use the Markdown sources and `npm run check`; a
configured QMD failure still follows the recovery policy above.
