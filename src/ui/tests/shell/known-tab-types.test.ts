import { describe, it, expect } from "vitest";

import { isKnownTabType, KNOWN_TAB_TYPES } from "@/shell/known-tab-types";

describe("known tab types", () => {
  it("keeps the tab types this build can render", () => {
    expect(isKnownTabType("terminal")).toBe(true);
    expect(isKnownTabType("files")).toBe(true);
    expect(isKnownTabType("tunnel")).toBe(true);
  });

  it("drops the retired remote-desktop tab types", () => {
    expect(isKnownTabType("rdp")).toBe(false);
    expect(isKnownTabType("vnc")).toBe(false);
    expect(isKnownTabType("telnet")).toBe(false);
    expect(KNOWN_TAB_TYPES.has("rdp")).toBe(false);
  });

  it("filters a persisted tab list down to the renderable tabs", () => {
    const saved = [
      { id: "a", tabType: "terminal" },
      { id: "b", tabType: "rdp" },
      { id: "c", tabType: "vnc" },
      { id: "d", tabType: "telnet" },
      { id: "e", tabType: "host-metrics" },
    ];

    expect(saved.filter((t) => isKnownTabType(t.tabType))).toEqual([
      { id: "a", tabType: "terminal" },
    ]);
  });
});
