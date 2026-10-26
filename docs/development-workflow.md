---
status: current
---

# Development workflow

This page records this project's own commands and integrations. Shared rules
are in the [foundation pages](foundation/README.md).

## Setup

```sh
bin/setup
bin/doctor
bin/check --full
```

Setup needs Git and Python 3.9 or later, and checks also need ShellCheck.
QMD and direnv are optional; setup reports skipped features.
Create `.envrc` only when the project needs environment settings, and review
it before running `direnv allow`; search does not need it.

## Project commands and boundaries

The maintainer foundation is optional for game creators. Its Git, Python,
ShellCheck, QMD, and direnv tools are supported on macOS and Linux; they
do not become prerequisites for the Node-only macOS/Windows game workflow.
This boundary was confirmed on October 1, 2026 to preserve creator portability.
Creator commands and Steam deployment remain unchanged.

## Checks

Follow the [check schedule](foundation/engineering-policy.md#checks). Run
`npm ci` to install application dependencies first. `bin/check-application`,
which `bin/check --full` runs after the foundation checks, verifies Node 24 or
newer, runs the Python tooling tests in `tests/`, and then runs the existing
`npm run check` (tests, script/config/art checks, and production build).
`tests/test_check_application.py` covers its order, runtime gate, and failure
handling.

GitHub validation is defined in [the workflow](../.github/workflows/build.yml).
CI integrates the full foundation check into the Linux job and keeps the
macOS/Windows creator checks. Full CI success must be checked for the
delivered revision; a local pass does not establish a remote result.

## Runtime and toolchain versions

`.nvmrc` and CI select the latest Node LTS (`lts/*`), and `package.json`
requires Node 24 or later. `bin/check-application` stops before any check only
when Node is older than 24. Maintainer tooling needs Python 3.9 or later.
Follow the [version policy](foundation/engineering-policy.md#runtime-and-toolchain-versions).

## Deployment

Pushes do not deploy. In a personalized game project, `npm run shipit` runs
`npm run check` and then deploys over SSH to the Steam Machine, as described
in [the project skill](../.agents/skills/make-steam-game/SKILL.md). The
starter example itself is never deployed, so nonfunctional changes here need
no deployment. Follow the
[deployment policy](foundation/engineering-policy.md#deployment-decisions).

## Project Starter

`.project-starter.json` records the installed Project Starter release and the
hashes of its managed files. Update them with Project Starter's `bin/sync`,
and record any intentional local change as an override with its reason.
