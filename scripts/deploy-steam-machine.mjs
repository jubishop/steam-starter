import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", reportFailure);
process.on("unhandledRejection", reportFailure);

let failureReported = false;
function reportFailure(error) {
  if (failureReported) {
    return;
  }
  failureReported = true;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nDeployment failed: ${message}`);
  process.exitCode = 1;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDirectory = resolve(projectRoot, "release");
const buildDirectory = resolve(releaseDirectory, "linux-unpacked");
const game = JSON.parse(await readFile(resolve(projectRoot, "game.config.json"), "utf8"));
const steamHost = process.env.STEAM_MACHINE_HOST || "steamdeck.local";
const steamUser = process.env.STEAM_MACHINE_USER || "deck";
const remote = `${steamUser}@${steamHost}`;

if (!/^[A-Za-z0-9._-]+$/u.test(steamHost)) {
  throw new Error("STEAM_MACHINE_HOST contains unsupported characters.");
}
if (!/^[A-Za-z0-9._-]+$/u.test(steamUser)) {
  throw new Error("STEAM_MACHINE_USER contains unsupported characters.");
}
if (!/^[a-z0-9][a-z0-9-]*$/u.test(game.slug)) {
  throw new Error("game.config.json slug must contain lowercase letters, digits, and hyphens.");
}
if (!/^[A-Za-z][A-Za-z0-9.-]+$/u.test(game.appId)) {
  throw new Error("game.config.json appId is not valid.");
}

const remoteDirectory = process.env.STEAM_MACHINE_TARGET || `/home/${steamUser}/Games/${game.slug}`;
const expectedRemote = new RegExp(`^/home/${escapeRegExp(steamUser)}/Games/[A-Za-z0-9._-]+$`, "u");
if (!expectedRemote.test(remoteDirectory)) {
  throw new Error("STEAM_MACHINE_TARGET must be a game folder under /home/<user>/Games/.");
}

const launcherDirectory = `/home/${steamUser}/.local/share/applications`;
const launcherPath = `${launcherDirectory}/${game.appId}.desktop`;
const launcherBuild = resolve(releaseDirectory, `${game.appId}.desktop`);
const remoteArchive = `/home/${steamUser}/Games/.${game.slug}.deploy.tar.gz`;
const localArchive = resolve(releaseDirectory, `${game.slug}-linux-x64.tar.gz`);
const wrapperPath = resolve(buildDirectory, game.slug);
const binaryPath = resolve(buildDirectory, `${game.slug}-bin`);
const shortcutTool = await readFile(resolve(projectRoot, "scripts/find-steam-shortcut.py"), "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function desktopStringEscape(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");
}

function run(command, args, { cwd = projectRoot, input, capture = false, quiet = false } = {}) {
  return new Promise((resolveRun, reject) => {
    let stdout = "";
    const child = spawn(command, args, {
      cwd,
      stdio: input === undefined
        ? capture ? ["ignore", "pipe", "inherit"] : quiet ? ["ignore", "ignore", "ignore"] : "inherit"
        : ["pipe", capture ? "pipe" : "inherit", "inherit"],
      windowsHide: false,
    });
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    child.once("error", reject);
    child.once("close", (code) => resolveRun({ code: code ?? 1, stdout }));
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });
}

async function mustRun(command, args, options = {}) {
  const result = await run(command, args, options);
  if (result.code !== 0) {
    throw new Error(`${command} exited with status ${result.code}.`);
  }
  return result.stdout.trim();
}

async function localHash(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function remoteHash(path) {
  const output = await mustRun("ssh", [remote, `sha256sum -- ${shellQuote(path)}`], { capture: true });
  return output.split(/\s+/u)[0];
}

async function verifySame(localPath, remotePath, label) {
  const [local, deployed] = await Promise.all([localHash(localPath), remoteHash(remotePath)]);
  if (local !== deployed) {
    throw new Error(`${label} hash differs after deployment.`);
  }
  console.log(`Verified ${label}.`);
}

async function requireReachableSteamMachine() {
  let address;
  try {
    ({ address } = await lookup(steamHost));
  } catch {
    throw new Error(`Cannot find ${steamHost}. Power on or wake the Steam Machine, confirm it is on the same network, and try again.`);
  }

  await new Promise((resolveConnection, reject) => {
    const socket = createConnection({ host: address, port: 22 });
    const fail = () => {
      socket.destroy();
      reject(new Error(`The Steam Machine did not answer on ${steamHost}. Power it on or wake it, confirm it is on the same network, and try again.`));
    };
    socket.setTimeout(5000, fail);
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.destroy();
      resolveConnection();
    });
  });
}

await requireReachableSteamMachine();

const sshReady = await run(
  "ssh",
  ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", remote, "true"],
  { quiet: true },
);
if (sshReady.code !== 0) {
  throw new Error("The Steam Machine is reachable but does not trust this computer yet. Run npm run setup:steam once, then deploy again.");
}

console.log("Building the Linux x64 game...");
await rm(buildDirectory, { recursive: true, force: true });
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
await mustRun(npmCommand, ["run", "package:linux"]);

await rename(resolve(buildDirectory, game.slug), binaryPath);
await copyFile(resolve(projectRoot, "packaging/steam-launcher"), wrapperPath);
await chmod(wrapperPath, 0o755);
await chmod(binaryPath, 0o755);
await copyFile(resolve(projectRoot, "assets/icon.png"), resolve(buildDirectory, "resources/game-icon.png"));

const steamArtDirectory = resolve(buildDirectory, "resources/steam-art");
await mkdir(steamArtDirectory, { recursive: true });
for (const filename of [
  "steam-icon.jpg",
  "steam-grid-portrait.png",
  "steam-grid-landscape.png",
  "steam-hero.png",
  "steam-logo.png",
]) {
  await copyFile(resolve(projectRoot, "assets", filename), resolve(steamArtDirectory, filename));
}

const launcherTemplate = await readFile(resolve(projectRoot, "packaging/game.desktop.in"), "utf8");
const launcherValues = {
  PRODUCT_NAME: desktopStringEscape(game.title),
  DESCRIPTION: desktopStringEscape(game.description),
  EXECUTABLE: `${remoteDirectory}/${game.slug}`,
  WORKING_DIRECTORY: remoteDirectory,
  ICON: `${remoteDirectory}/resources/game-icon.png`,
  DESKTOP_NAME: game.appId,
};
const launcher = launcherTemplate.replace(
  /@(PRODUCT_NAME|DESCRIPTION|EXECUTABLE|WORKING_DIRECTORY|ICON|DESKTOP_NAME)@/gu,
  (_match, key) => launcherValues[key],
);
await writeFile(launcherBuild, launcher, "utf8");

await rm(localArchive, { force: true });
await mustRun("tar", ["-czf", localArchive, "-C", buildDirectory, "."]);

console.log(`Uploading to ${remote}:${remoteDirectory}...`);
await mustRun("ssh", [remote, `mkdir -p ${shellQuote(`/home/${steamUser}/Games`)} ${shellQuote(launcherDirectory)}`]);
await mustRun("scp", [localArchive, `${remote}:${remoteArchive}`]);

const installScript = `
set -euo pipefail
target=$1
next=$2
previous=$3
archive=$4
slug=$5
activated=0
had_previous=0
cleanup() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$activated" -eq 1 ]; then
    rm -rf -- "$target"
    if [ "$had_previous" -eq 1 ] && [ -e "$previous" ]; then
      mv -- "$previous" "$target"
    fi
  fi
  rm -rf -- "$next"
  rm -f -- "$archive"
  if [ "$status" -eq 0 ]; then
    rm -rf -- "$previous"
  fi
  exit "$status"
}
trap cleanup EXIT
rm -rf -- "$next" "$previous"
mkdir -p -- "$next"
tar -xzf "$archive" -C "$next"
chmod 0755 "$next/$slug" "$next/$slug-bin"
test -x "$next/$slug"
test -x "$next/$slug-bin"
test -r "$next/resources/app.asar"
if [ -e "$target" ]; then
  mv -- "$target" "$previous"
  had_previous=1
fi
mv -- "$next" "$target"
activated=1
test -x "$target/$slug"
test -r "$target/resources/app.asar"
`;
await mustRun(
  "ssh",
  [
    remote,
    `bash -s -- ${shellQuote(remoteDirectory)} ${shellQuote(`${remoteDirectory}.next`)} ${shellQuote(`${remoteDirectory}.previous`)} ${shellQuote(remoteArchive)} ${shellQuote(game.slug)}`,
  ],
  { input: installScript },
);

console.log("Installing the Desktop launcher...");
await mustRun("scp", [launcherBuild, `${remote}:${launcherPath}`]);
await mustRun(
  "ssh",
  [
    remote,
    `chmod 0644 ${shellQuote(launcherPath)} && desktop-file-validate ${shellQuote(launcherPath)} && update-desktop-database ${shellQuote(launcherDirectory)} && test -r ${shellQuote(launcherPath)}`,
  ],
);

console.log("Looking for the Steam library shortcut...");
const shortcutOutput = await mustRun(
  "ssh",
  [remote, `python3 - ${shellQuote(`${remoteDirectory}/${game.slug}`)}`],
  { capture: true, input: shortcutTool },
);
const shortcuts = shortcutOutput
  ? shortcutOutput.split(/\r?\n/u).map((line) => line.split("\t"))
  : [];

let steamWasActive = false;
if (shortcuts.length === 0) {
  console.log(`Steam shortcut not found yet. In Desktop Mode, add ${game.title} as a Non-Steam Game once, then deploy again.`);
} else {
  const expectedGrid = new RegExp(`^/home/${escapeRegExp(steamUser)}/\\.local/share/Steam/userdata/[0-9]+/config/grid$`, "u");
  for (const fields of shortcuts) {
    if (fields.length !== 2 || !/^[0-9]+$/u.test(fields[0]) || !expectedGrid.test(fields[1])) {
      throw new Error(`Unexpected Steam shortcut lookup result: ${fields.join(" ")}`);
    }
  }

  for (const [appId, gridDirectory] of shortcuts) {
    await mustRun("ssh", [remote, `mkdir -p ${shellQuote(gridDirectory)}`]);
    const artwork = [
      ["steam-grid-portrait.png", `${appId}p.png`],
      ["steam-grid-landscape.png", `${appId}.png`],
      ["steam-icon.jpg", `${appId}_icon.jpg`],
      ["steam-hero.png", `${appId}_hero.png`],
      ["steam-logo.png", `${appId}_logo.png`],
    ];
    for (const [source, destination] of artwork) {
      await mustRun("scp", [resolve(projectRoot, "assets", source), `${remote}:${gridDirectory}/${destination}`]);
    }
    console.log(`Installed Steam artwork for shortcut ${appId}.`);
  }

  const steamState = await run(
    "ssh",
    [remote, "systemctl --user is-active steam-launcher.service 2>/dev/null || true"],
    { capture: true },
  );
  steamWasActive = steamState.stdout.trim() === "active";

  let metadataError;
  try {
    if (steamWasActive) {
      console.log("Stopping Steam briefly to update shortcut metadata...");
      await mustRun(
        "ssh",
        [remote, "systemctl --user stop steam-launcher.service && ! pgrep -x steam >/dev/null"],
      );
    }
    for (const [appId, gridDirectory] of shortcuts) {
      const shortcutFile = `${posix.dirname(gridDirectory)}/shortcuts.vdf`;
      const iconPath = `${gridDirectory}/${appId}_icon.jpg`;
      await mustRun(
        "ssh",
        [
          remote,
          `python3 - --set-icon ${shellQuote(iconPath)} ${shellQuote(`${remoteDirectory}/${game.slug}`)} ${shellQuote(shortcutFile)}`,
        ],
        { input: shortcutTool },
      );
    }
  } catch (error) {
    metadataError = error;
  } finally {
    if (steamWasActive) {
      console.log("Restarting Steam...");
      const restart = await run("ssh", [remote, "systemctl --user start steam-launcher.service"]);
      if (restart.code !== 0 && !metadataError) {
        metadataError = new Error("Steam did not restart after its shortcut metadata update.");
      }
    }
  }
  if (metadataError) {
    throw metadataError;
  }
}

await verifySame(wrapperPath, `${remoteDirectory}/${game.slug}`, "launcher");
await verifySame(
  resolve(buildDirectory, "resources/app.asar"),
  `${remoteDirectory}/resources/app.asar`,
  "packaged game",
);
for (const [appId, gridDirectory] of shortcuts) {
  await verifySame(resolve(projectRoot, "assets/steam-icon.jpg"), `${gridDirectory}/${appId}_icon.jpg`, "compact Steam icon");
}
if (steamWasActive) {
  const active = await mustRun("ssh", [remote, "systemctl --user is-active steam-launcher.service"], { capture: true });
  if (active !== "active") {
    throw new Error("Steam is not active after deployment.");
  }
}

console.log(`Deployment complete. ${game.title} is installed on the Steam Machine.`);
console.log("If it is already in Steam, exit and relaunch it to use the new build.");
