import { spawn } from "node:child_process";
import { access, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

import { probeSteamMachine, steamMachineTarget } from "./lib/steam-machine.mjs";

process.on("uncaughtException", reportFailure);
process.on("unhandledRejection", reportFailure);

let failureReported = false;
function reportFailure(error) {
  if (failureReported) {
    return;
  }
  failureReported = true;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSSH setup failed: ${message}`);
  process.exitCode = 1;
}

const steamMachine = steamMachineTarget();
const { host: steamHost, user: steamUser, remote } = steamMachine;
const sshDirectory = resolve(homedir(), ".ssh");
const keyPath = resolve(sshDirectory, "id_ed25519");

function run(command, args, { input } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("close", (code) => resolveRun(code ?? 1));
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

const probe = await probeSteamMachine(steamMachine);
if (probe.status === "unreachable") {
  throw new Error(probe.message);
}
if (probe.status === "ready") {
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

const verification = await probeSteamMachine(steamMachine);
if (verification.status !== "ready") {
  console.error(`SSH key setup did not complete. ${verification.message}`);
  process.exit(1);
}

console.log("Steam Machine SSH setup is complete. Future deploys do not need a password.");
