import { createServer } from "node:net";

import { afterEach, describe, expect, it, vi } from "vitest";

import { answersOnPort, probeSteamMachine, steamMachineTarget } from "./steam-machine.mjs";

const target = steamMachineTarget({});
const wakeRemedy = "Power on or wake the Steam Machine, confirm it is on the same network, and try again.";

function fakeNetwork({ lookupHost, connectPort, runSsh } = {}) {
  return {
    lookupHost: vi.fn(lookupHost ?? (async () => "192.0.2.10")),
    connectPort: vi.fn(connectPort ?? (async () => true)),
    runSsh: vi.fn(runSsh ?? (async () => 0)),
  };
}

let server;
afterEach(async () => {
  if (server) {
    await new Promise((resolveClose) => server.close(resolveClose));
    server = undefined;
  }
});

describe("steamMachineTarget", () => {
  it("defaults to deck@steamdeck.local", () => {
    expect(target).toEqual({ host: "steamdeck.local", user: "deck", remote: "deck@steamdeck.local" });
  });

  it("honors STEAM_MACHINE_HOST and STEAM_MACHINE_USER", () => {
    expect(
      steamMachineTarget({ STEAM_MACHINE_HOST: "living-room.local", STEAM_MACHINE_USER: "player" }),
    ).toEqual({ host: "living-room.local", user: "player", remote: "player@living-room.local" });
  });

  it("rejects a host or user that could reach a shell", () => {
    expect(() => steamMachineTarget({ STEAM_MACHINE_HOST: "steamdeck.local; rm -rf ~" })).toThrow(
      "STEAM_MACHINE_HOST contains unsupported characters.",
    );
    expect(() => steamMachineTarget({ STEAM_MACHINE_USER: "deck@other" })).toThrow(
      "STEAM_MACHINE_USER contains unsupported characters.",
    );
  });
});

describe("probeSteamMachine", () => {
  it("reports ready when batch-mode SSH accepts this computer's key", async () => {
    const network = fakeNetwork();

    await expect(probeSteamMachine(target, network)).resolves.toMatchObject({ status: "ready" });
    expect(network.lookupHost).toHaveBeenCalledWith("steamdeck.local");
    expect(network.connectPort).toHaveBeenCalledWith("192.0.2.10", 22, 5000);
    expect(network.runSsh).toHaveBeenCalledWith([
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=5",
      "deck@steamdeck.local",
      "true",
    ]);
  });

  it("reports unreachable without connecting when the host name does not resolve", async () => {
    const network = fakeNetwork({
      lookupHost: async () => {
        throw new Error("getaddrinfo ENOTFOUND steamdeck.local");
      },
    });

    await expect(probeSteamMachine(target, network)).resolves.toEqual({
      status: "unreachable",
      message: `Cannot find steamdeck.local. ${wakeRemedy}`,
    });
    expect(network.connectPort).not.toHaveBeenCalled();
    expect(network.runSsh).not.toHaveBeenCalled();
  });

  it("reports unreachable without SSH when port 22 does not answer", async () => {
    const network = fakeNetwork({ connectPort: async () => false });

    await expect(probeSteamMachine(target, network)).resolves.toEqual({
      status: "unreachable",
      message: `The Steam Machine did not answer on steamdeck.local. ${wakeRemedy}`,
    });
    expect(network.runSsh).not.toHaveBeenCalled();
  });

  it("reports untrusted when port 22 answers but batch-mode SSH fails", async () => {
    const network = fakeNetwork({ runSsh: async () => 255 });

    await expect(probeSteamMachine(target, network)).resolves.toEqual({
      status: "untrusted",
      message: "The Steam Machine is reachable but does not trust this computer yet.",
    });
  });
});

describe("answersOnPort", () => {
  it("is true only while something listens on the port", async () => {
    server = createServer((socket) => socket.destroy());
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const { port } = server.address();

    await expect(answersOnPort("127.0.0.1", port, 5000)).resolves.toBe(true);

    await new Promise((resolveClose) => server.close(resolveClose));
    server = undefined;
    await expect(answersOnPort("127.0.0.1", port, 5000)).resolves.toBe(false);
  });
});
