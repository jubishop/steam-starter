import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createConnection } from "node:net";

const namePattern = /^[A-Za-z0-9._-]+$/u;
const wakeRemedy = "Power on or wake the Steam Machine, confirm it is on the same network, and try again.";

export function steamMachineTarget(env = process.env) {
  const host = env.STEAM_MACHINE_HOST || "steamdeck.local";
  const user = env.STEAM_MACHINE_USER || "deck";
  if (!namePattern.test(host)) {
    throw new Error("STEAM_MACHINE_HOST contains unsupported characters.");
  }
  if (!namePattern.test(user)) {
    throw new Error("STEAM_MACHINE_USER contains unsupported characters.");
  }
  return { host, user, remote: `${user}@${host}` };
}

export function answersOnPort(address, port, timeoutMs) {
  return new Promise((resolveAnswer) => {
    const socket = createConnection({ host: address, port });
    const finish = (answered) => {
      socket.destroy();
      resolveAnswer(answered);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("error", () => finish(false));
    socket.once("connect", () => finish(true));
  });
}

async function lookupAddress(host) {
  return (await lookup(host)).address;
}

function runQuietSsh(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn("ssh", args, { stdio: "ignore", windowsHide: false });
    child.once("error", reject);
    child.once("close", (code) => resolveRun(code ?? 1));
  });
}

// Reports whether the Steam Machine is ready, unreachable, or untrusted, with a
// creator-facing message. Tests replace the network steps.
export async function probeSteamMachine(
  { host, remote },
  { lookupHost = lookupAddress, connectPort = answersOnPort, runSsh = runQuietSsh } = {},
) {
  let address;
  try {
    address = await lookupHost(host);
  } catch {
    return { status: "unreachable", message: `Cannot find ${host}. ${wakeRemedy}` };
  }
  if (!(await connectPort(address, 22, 5000))) {
    return { status: "unreachable", message: `The Steam Machine did not answer on ${host}. ${wakeRemedy}` };
  }
  const sshStatus = await runSsh(["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", remote, "true"]);
  if (sshStatus === 0) {
    return { status: "ready", message: "The Steam Machine accepts this computer's SSH key." };
  }
  return { status: "untrusted", message: "The Steam Machine is reachable but does not trust this computer yet." };
}
