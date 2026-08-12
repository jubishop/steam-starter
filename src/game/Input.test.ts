import { describe, expect, it } from "vitest";

import { selectConnectedGamepads } from "./Input";

function gamepad(id: string, index: number, connected = true): Gamepad {
  return { connected, id, index } as Gamepad;
}

const physicalXbox = gamepad(
  "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
  0,
);
const steamVirtualOne = gamepad(
  "Microsoft X-Box 360 pad 0 (STANDARD GAMEPAD Vendor: 28de Product: 11ff)",
  1,
);

describe("controller selection", () => {
  it("uses the physical controller instead of its Steam Input duplicate", () => {
    expect(selectConnectedGamepads([physicalXbox, steamVirtualOne])).toEqual([
      physicalXbox,
    ]);
  });

  it("keeps all physical controllers when Steam Input is absent", () => {
    const secondPhysical = gamepad(
      "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
      2,
    );
    expect(selectConnectedGamepads([physicalXbox, secondPhysical])).toEqual([
      physicalXbox,
      secondPhysical,
    ]);
  });

  it("keeps multiple Steam Input controllers when physical devices are hidden", () => {
    const steamVirtualTwo = gamepad(
      "Microsoft X-Box 360 pad 1 (STANDARD GAMEPAD Vendor: 28de Product: 11ff)",
      3,
    );
    expect(
      selectConnectedGamepads([
        steamVirtualOne,
        steamVirtualTwo,
      ]),
    ).toEqual([steamVirtualOne, steamVirtualTwo]);
  });

  it("keeps both physical controllers when one Steam virtual pad is visible", () => {
    const secondPhysical = gamepad(
      "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
      2,
    );
    const steamVirtualTwo = gamepad(
      "Microsoft X-Box 360 pad 1 (STANDARD GAMEPAD Vendor: 28de Product: 11ff)",
      3,
    );

    expect(
      selectConnectedGamepads([
        physicalXbox,
        null,
        secondPhysical,
        steamVirtualTwo,
      ]),
    ).toEqual([physicalXbox, secondPhysical]);
  });

  it("ignores disconnected controller slots", () => {
    expect(
      selectConnectedGamepads([
        null,
        gamepad(physicalXbox.id, physicalXbox.index, false),
      ]),
    ).toEqual([]);
  });
});
