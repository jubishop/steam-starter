import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export function npmInvocation({
  execPath = process.execPath,
  npmExecPath = process.env.npm_execpath,
} = {}) {
  if (!npmExecPath) {
    throw new Error("Run deployment through npm so the npm CLI path is available.");
  }
  return { command: execPath, args: [npmExecPath] };
}

export async function isMatchingElectronDistribution(directory, expectedVersion) {
  try {
    const version = (await readFile(resolve(directory, "version"), "utf8")).trim();
    await access(resolve(directory, "electron"));
    await access(resolve(directory, "resources"));
    return version === expectedVersion;
  } catch {
    return false;
  }
}
