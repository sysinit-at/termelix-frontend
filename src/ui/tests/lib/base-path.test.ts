import { describe, it, expect, afterEach } from "vitest";
import { getBasePath } from "../../lib/base-path.js";

const win = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete win.__TERMELIX_BASE_PATH__;
});

describe("getBasePath", () => {
  it("returns empty string when no runtime override is set (default base)", () => {
    // Vite test env BASE_URL is "/" which the helper normalizes to "".
    expect(getBasePath()).toBe("");
  });

  it("uses the runtime override when present", () => {
    win.__TERMELIX_BASE_PATH__ = "/termelix";
    expect(getBasePath()).toBe("/termelix");
  });

  it("strips a trailing slash from the runtime override", () => {
    win.__TERMELIX_BASE_PATH__ = "/termelix/";
    expect(getBasePath()).toBe("/termelix");
  });
});
