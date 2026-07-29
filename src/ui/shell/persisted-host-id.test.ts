import { describe, it, expect } from "vitest";

import { persistedHostId } from "./persisted-host-id";

const host = (id: string) => ({ id }) as never;

describe("persistedHostId", () => {
  it("keeps a saved host's numeric id", () => {
    expect(persistedHostId(host("42"))).toBe(42);
  });

  it("returns null for a pseudo-host, not NaN", () => {
    // `parseInt("serial-1753560000000")` is NaN, which JSON turns into null — the right answer
    // reached by a value that means "not a number".
    expect(persistedHostId(host("serial-1753560000000"))).toBeNull();
  });

  it("rejects ids that only start with digits", () => {
    // `parseInt` would answer 12 here and bind the tab to somebody else's host.
    expect(persistedHostId(host("12-serial"))).toBeNull();
  });

  it("returns null for no host at all", () => {
    expect(persistedHostId(undefined)).toBeNull();
    expect(persistedHostId(null)).toBeNull();
  });
});
