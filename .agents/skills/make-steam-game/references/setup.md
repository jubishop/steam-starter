# First-time setup

There are four separate one-time checks or steps. Explain which one is needed so the creator is not overwhelmed.

## 0. Check the creator computer

Codex checks `node`, `npm`, `git`, `ssh`, `scp`, and `tar` before starting. Use Node.js 24 or newer. macOS and current Windows versions include the SSH and archive tools; Git or Node.js might still need installation.

If a tool is missing, explain its purpose in one sentence. Ask a parent before installing system software. On Windows, prefer `winget`; on macOS, use the creator's existing package manager or the official installer. Verify each installed command before continuing. GitHub CLI (`gh`) is optional when Codex can create the repository through its GitHub connection.

## 1. Enable SSH on the Steam Machine

This normally needs a parent once:

1. Enter Desktop Mode on the Steam Machine.
2. Open Konsole.
3. Run `sudo systemctl enable --now sshd`.
4. Enter the parent-provided admin password into the password prompt. Typed characters are intentionally invisible.
5. Leave Konsole open until the creator-computer setup succeeds.

If the `deck` account has no password yet, the parent can run `passwd` first and choose one. Never collect or retain that password.

## 2. Trust the creator computer through SSH

On Windows 11, make sure **OpenSSH Client** is installed in **Settings → System → Optional features**. It is normally already present. macOS includes OpenSSH.

From Codex, run `npm run setup:steam` in an interactive process. The Node helper works on macOS and Windows. If Codex cannot safely let the creator type into its running process, Codex opens Terminal on macOS or PowerShell on Windows and starts this one command for them. The creator types only the password. The helper:

- uses `deck@steamdeck.local`;
- creates a local SSH key if needed;
- asks for the Steam Machine password once;
- installs only the public key;
- verifies that later SSH connections need no password.

The normal `deck` and `steamdeck.local` values are built in, so the child does not need environment variables. `STEAM_MACHINE_USER`, `STEAM_MACHINE_HOST`, and `STEAM_MACHINE_TARGET` remain optional overrides for a different machine.

Tell the creator before the password prompt appears. They must type the password only there, never into the conversation.

## 3. Add one Non-Steam Game

Each new game needs this once:

1. Run the first deployment for the creator. It installs the game and its Desktop launcher.
2. Enter Desktop Mode on the Steam Machine.
3. Open Steam and choose **Games → Add a Non-Steam Game to My Library**.
4. Select the game by its title and add it.
5. Return to Gaming Mode.
6. Run the deployment again for the creator. It discovers the shortcut ID, installs all artwork, sets the compact icon, and refreshes Steam.

All later game updates happen from Codex over SSH. Desktop Mode is not needed again unless the shortcut is removed.
