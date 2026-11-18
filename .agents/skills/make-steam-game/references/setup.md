# First-time setup

Each step happens once. Explain only the step the current state needs, so the creator is not overwhelmed.

## 1. Enable SSH on the Steam Machine

This normally needs a parent once:

1. Enter Desktop Mode on the Steam Machine.
2. Open Konsole.
3. Run `sudo systemctl enable --now sshd`.
4. Enter the parent-provided admin password into the password prompt. Typed characters are intentionally invisible.
5. Leave Konsole open until the creator-computer setup succeeds.

If the `deck` account has no password yet, the parent can run `passwd` first and choose one.

## 2. Trust the creator computer through SSH

Run `npm run setup:steam` for the creator in an interactive process. If they cannot safely type into your running process, open Terminal on macOS or PowerShell on Windows and start that one command for them. It creates this computer's SSH key if needed, installs only the public key, and verifies that later connections need no password.

Tell the creator before its one password prompt appears. They type the Steam Machine password only there, never into the conversation.

## 3. Add one Non-Steam Game

Each new game needs this once, after its first deployment reports the shortcut missing:

1. Enter Desktop Mode on the Steam Machine.
2. Open Steam and choose **Games → Add a Non-Steam Game to My Library**.
3. Select the game by its title and add it.
4. Return to Gaming Mode.

Then run `npm run shipit` again; it finds the shortcut, installs the artwork and compact icon, and refreshes Steam. Desktop Mode is not needed again unless the shortcut is removed.
