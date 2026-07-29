import { describe, expect, it, vi } from "vitest";

import { coalesce } from "./coalesce";

/** A fetcher whose resolution this test controls, so nothing races. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("coalesce", () => {
  it("shares one in-flight request across concurrent callers", async () => {
    const d = deferred<string>();
    const fetcher = vi.fn(() => d.promise);
    const c = coalesce(fetcher, 1000);

    const all = Promise.all([c.get(), c.get(), c.get()]);
    d.resolve("ava");

    expect(await all).toEqual(["ava", "ava", "ava"]);
    // The measurement the module exists for: three callers, one round-trip.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("answers a caller arriving just after, from the settled value", async () => {
    let clock = 0;
    const fetcher = vi.fn(async () => "ava");
    const c = coalesce(fetcher, 1000, () => clock);

    expect(await c.get()).toBe("ava");
    clock = 999;
    expect(await c.get()).toBe("ava");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once the window has passed", async () => {
    let clock = 0;
    const fetcher = vi.fn(async () => "ava");
    const c = coalesce(fetcher, 1000, () => clock);

    await c.get();
    clock = 1000;
    await c.get();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("forgets everything on invalidate, which is the security property", async () => {
    let who = "ava";
    const fetcher = vi.fn(async () => who);
    const c = coalesce(fetcher, 60_000);

    expect(await c.get()).toBe("ava");

    // A logout, then a different user. Without the invalidate this returns "ava" for the next
    // minute — one account's identity served to another, which is the whole reason the TTL is
    // not trusted to expire on its own.
    c.invalidate();
    who = "bo";

    expect(await c.get()).toBe("bo");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("discards an answer that arrives after an invalidate mid-flight", async () => {
    const first = deferred<string>();
    let next: () => Promise<string> = () => first.promise;
    const c = coalesce(() => next(), 60_000);

    const pending = c.get();
    // The auth transition lands while the request is still open, so its answer describes
    // whoever was logged in before it and must not become the cached identity.
    c.invalidate();
    first.resolve("ava");
    expect(await pending).toBe("ava");

    next = async () => "bo";
    expect(await c.get()).toBe("bo");
  });

  it("never caches a rejection", async () => {
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("network");
      return "ava";
    });
    const c = coalesce(fetcher, 60_000);

    await expect(c.get()).rejects.toThrow("network");
    // A cached failure turns one dropped request into a spurious logout for the whole window.
    expect(await c.get()).toBe("ava");
  });

  it("does not fall back to a value it already judged too old", async () => {
    let clock = 0;
    let attempt = 0;
    const fetcher = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) return "ava";
      throw new Error("network");
    });
    const c = coalesce(fetcher, 1000, () => clock);

    expect(await c.get()).toBe("ava");
    clock = 5000;
    // The stale value was dropped before the refetch, so the failure surfaces rather than
    // being papered over with an answer this call had already decided not to trust.
    await expect(c.get()).rejects.toThrow("network");
  });
});
