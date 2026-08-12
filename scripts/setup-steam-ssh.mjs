import { spawn } from "node:child_process";
import { access, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

const steamHost = process.env.STEAM_MACHINE_HOST || "steamdeck.local";
const steamUser = process.env.STEAM_MACHINE_USER || "deck";
const remote = `${steamUser}@${steamHost}`;
const sshDirectory = resolve(homedir(), ".ssh");
const keyPath = resolve(sshDirectory, "id_ed25519");

function run(command, args, { input, quiet = false } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      stdio: input === undefined
        ? quiet ? ["ignore", "ignore", "ignore"] : "inherit"
        : ["pipe", "inherit", "inherit"],
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("close", (code) => resolveRun(code ?? 1));
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

if (
  (await run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", remote, "true"], {
    quiet: true,
  })) === 0
) {
  console.log("Steam Machine SSH is already ready.");
  process.exit(0);
}

await mkdir(sshDirectory, { recursive: true, mode: 0o700 });
try {
  await access(`${keyPath}.pub`);
} catch {
  console.log("Creating this computer's SSH key...");
  const keyStatus = await run("ssh-keygen", [
    "-q",
    "-t",
    "ed25519",
    "-N",
    "",
    "-C",
    "steam-game-builder",
    "-f",
    keyPath,
  ]);
  if (keyStatus !== 0) {
    process.exit(keyStatus);
  }
}

console.log("\nThe Steam Machine password is needed once.");
console.log("Type it only into the password prompt. Characters will not appear on screen.");
console.log("Never paste the password into Codex or save it in this project.\n");

const publicKey = await readFile(`${keyPath}.pub`, "utf8");
const installKey = [
  "umask 077",
  'mkdir -p "$HOME/.ssh"',
  'touch "$HOME/.ssh/authorized_keys"',
  "key=$(cat)",
  'grep -qxF "$key" "$HOME/.ssh/authorized_keys" || printf "%s\\n" "$key" >> "$HOME/.ssh/authorized_keys"',
].join("; ");
const copyStatus = await run(
  "ssh",
  ["-o", "StrictHostKeyChecking=accept-new", remote, installKey],
  { input: publicKey },
);
if (copyStatus !== 0) {
  process.exit(copyStatus);
}

if (process.platform === "win32") {
  await run("setx", ["STEAM_MACHINE_HOST", steamHost]);
  await run("setx", ["STEAM_MACHINE_USER", steamUser]);
}

const verifyStatus = await run(
  "ssh",
  ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", remote, "true"],
  { quiet: true },
);
if (verifyStatus !== 0) {
  console.error("SSH key setup did not complete.");
  process.exit(verifyStatus);
}

console.log("Steam Machine SSH setup is complete. Future deploys do not need a password.");
