# Project instructions

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

Keep durable project guidance in [memory](memory/README.md), and designs,
decisions, and research in [docs](docs/README.md). Follow the
[local task workflow](docs/task-tracking.md) for td setup and commands.

The foundation below is optional maintainer tooling for a Git checkout on
macOS or Linux. Game creators keep the Node-only macOS/Windows workflow.
Do not require Git, Python, ShellCheck, QMD, direnv, or td to create, test,
package, or deploy a game. When these tools are not configured, use the
Markdown sources and `npm run check`; a configured QMD failure still follows
the recovery policy below.

When QMD is configured, search relevant knowledge before non-trivial work or writing memory.
Use `bin/knowledge search "term"` for known terms and
`bin/knowledge query "question" --no-rerank` for broader questions.
Read focused results with `bin/knowledge get <path> -l 80`.
Use direct reads or `rg` for known paths or after a successful lookup with no
matches. Markdown source files are authoritative. Update existing pages when possible.
If configured QMD fails, report it to the user immediately and attempt repair.
If repair fails, pause knowledge-dependent work until the user approves a
fallback; never silently bypass broken QMD with `rg` or direct reads. Follow
the [search failure policy](docs/development-workflow.md#search-failures).

Follow the engineering policies linked below:

- Prefer fewer dependencies; justify additions by their concrete benefits
  under the [dependency policy](docs/development-workflow.md#third-party-dependencies).
- Cover regression fixes and functional changes with automated tests. Use
  [red-green TDD](docs/development-workflow.md#test-driven-development)
  when practical; explain exceptions. Test observable behavior through public
  interfaces, with fakes at external-system boundaries.
- Keep [test cost proportional](docs/development-workflow.md#test-cost-and-coverage)
  while preserving coverage, independence, and useful complete journeys.
- Keep [files cohesive](docs/development-workflow.md#file-organization);
  approximately 1,000 lines is a review threshold for source, tests, and styles.
- Keep [Markdown pages focused](docs/development-workflow.md#markdown-pages)
  on one topic or reader task, without numeric size limits.
- Isolate [validation inputs and output](docs/development-workflow.md#validation-checkout-isolation)
  to the active checkout.
- Declare supported [runtime and toolchain versions](docs/development-workflow.md#runtime-and-toolchain-versions)
  and keep development, CI, and deployment compatible.

For maintainer setup, run `bin/setup` after cloning. Choose checks for the changed files: use
`bin/check --documents-only` for Markdown edits and `bin/check` for foundation
checks only. Keep application tools out of both modes; run relevant application
checks explicitly for code edits.
Run `bin/check --full` locally after setup, test/build infrastructure changes,
or when focused checks leave material uncertainty. Require successful full
validation before merge or release. An enforced full CI gate can supply that
result for ordinary code changes; otherwise run the full check locally before
delivery. Do not run checks for discussion or read-only work. Batch edits
before checking; reuse passing results while relevant inputs are unchanged.
See [the workflow](docs/development-workflow.md#checks-and-project-extensions).
Nonfunctional changes may be pushed without deployment or a package release;
follow the [deployment policy](docs/development-workflow.md#deployment-decisions).
Use `bin/doctor` to inspect local setup and `bin/qmd-index` to refresh search
after uncommitted knowledge edits when current search results are needed.
Hooks refresh search after Git events.
