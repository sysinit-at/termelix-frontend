import { describe, it, expect } from "vitest";

import { countActiveTunnels, isTunnelConnected } from "./tunnel-status";

describe("tunnel status", () => {
  it("accepts the case the server actually sends", () => {
    // `Atom.to_string(:connected)` — this is the shape on the wire, and the shape the dashboard
    // card compared against the literal "CONNECTED", which is why it read 0 with tunnels up.
    expect(isTunnelConnected({ status: "connected" as never })).toBe(true);
  });

  it("accepts the spelling in the SPA's own type", () => {
    expect(isTunnelConnected({ status: "CONNECTED" as never })).toBe(true);
  });

  it("rejects every other state", () => {
    for (const status of ["connecting", "disconnected", "error", "waiting"]) {
      expect(isTunnelConnected({ status: status as never })).toBe(false);
    }
    expect(isTunnelConnected(undefined)).toBe(false);
    expect(isTunnelConnected(null)).toBe(false);
  });

  it("counts a mixed map", () => {
    expect(
      countActiveTunnels({
        a: { status: "connected" as never },
        b: { status: "CONNECTED" as never },
        c: { status: "connecting" as never },
        d: null,
      }),
    ).toBe(2);
    expect(countActiveTunnels(undefined)).toBe(0);
    expect(countActiveTunnels({})).toBe(0);
  });
});
