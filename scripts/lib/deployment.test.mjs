import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { isMatchingElectronDistribution, npmInvocation } from "./deployment.mjs";

const testDirectory = resolve(tmpdir(), `steam-starter-deployment-${process.pid}`);

afterEach(async () => {
  await rm(testDirectory, { recursive: true, force: true });
});

describe("deployment helpers", () => {
  it("runs npm through the current Node executable instead of spawning npm.cmd", () => {
    expect(
      npmInvocation({ execPath: "C:/Node/node.exe", npmExecPath: "C:/npm/npm-cli.js" }),
    ).toEqual({
      command: "C:/Node/node.exe",
      args: ["C:/npm/npm-cli.js"],
    });
  });

  it("rejects deployment outside an npm script", () => {
    expect(() => npmInvocation({ execPath: "node", npmExecPath: "" })).toThrow(
      "Run deployment through npm",
    );
  });

  it("accepts only a complete Electron distribution with the expected version", async () => {
    await mkdir(resolve(testDirectory, "resources"), { recursive: true });
    await writeFile(resolve(testDirectory, "electron"), "binary");
    await writeFile(resolve(testDirectory, "version"), "43.4.0\n");

    await expect(isMatchingElectronDistribution(testDirectory, "43.4.0")).resolves.toBe(true);
    await expect(isMatchingElectronDistribution(testDirectory, "43.5.0")).resolves.toBe(false);
  });
});
