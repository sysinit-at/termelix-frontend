import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import {
  ChunkErrorBoundary,
  lazyChunk,
  resetChunkReloadGuard,
} from "./lazy-chunk";

/**
 * A deploy replaces the whole asset directory, so a page that has been open across one holds
 * chunk filenames the server no longer has. This app updates by `docker compose up -d` while
 * people have tabs open, so that is the normal case, not an edge one.
 *
 * Before this helper a failed chunk import threw during render and — with no error boundary
 * anywhere in the app — unmounted the entire tree. A blank page over somebody's live terminal.
 */

const reload = vi.fn();

beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => vi.restoreAllMocks());

function Ok() {
  return <div>loaded</div>;
}

describe("a transient failure", () => {
  it("is retried once, and the component still renders", async () => {
    let calls = 0;
    const Lazy = lazyChunk(async () => {
      calls += 1;
      if (calls === 1) throw new Error("network blip");
      return { default: Ok };
    }, "blip");

    render(
      <ChunkErrorBoundary name="blip">
        <React.Suspense fallback={<div>loading</div>}>
          <Lazy />
        </React.Suspense>
      </ChunkErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByText("loaded")).toBeTruthy());
    expect(calls).toBe(2);
    // A blip is not a deploy — nothing should have reloaded the page.
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("a chunk that is really gone (the deploy case)", () => {
  it("reloads the page once, so the browser fetches the new filenames", async () => {
    const Lazy = lazyChunk(async () => {
      throw new Error("404");
    }, "gone");

    render(
      <ChunkErrorBoundary name="gone">
        <React.Suspense fallback={<div>loading</div>}>
          <Lazy />
        </React.Suspense>
      </ChunkErrorBoundary>,
    );

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("does NOT reload a second time — a broken build must not loop forever", async () => {
    // The guard is per chunk name and per session: one reload is a stale page, two is a build
    // that cannot load, and reloading through that is a browser nobody can use.
    const make = () =>
      lazyChunk(async () => {
        throw new Error("404");
      }, "broken");

    const First = make();
    render(
      <ChunkErrorBoundary name="broken">
        <React.Suspense fallback={null}>
          <First />
        </React.Suspense>
      </ChunkErrorBoundary>,
    );
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

    const Second = make();
    render(
      <ChunkErrorBoundary name="broken" fallback={<div>could not load</div>}>
        <React.Suspense fallback={null}>
          <Second />
        </React.Suspense>
      </ChunkErrorBoundary>,
    );

    // Still once. And the user is told, rather than shown a blank page.
    await waitFor(() =>
      expect(screen.getByText("could not load")).toBeTruthy(),
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("the guard can be cleared, so a later session gets its own chance", () => {
    sessionStorage.setItem("termelix_chunk_reload:x", "1");
    resetChunkReloadGuard("x");
    expect(sessionStorage.getItem("termelix_chunk_reload:x")).toBeNull();
  });
});

describe("the boundary", () => {
  it("shows the fallback instead of unmounting the tree", () => {
    function Boom(): React.ReactElement {
      throw new Error("render failed");
    }

    render(
      <div>
        <span>sibling survives</span>
        <ChunkErrorBoundary name="boom" fallback={<span>fallback</span>}>
          <Boom />
        </ChunkErrorBoundary>
      </div>,
    );

    // The point: everything AROUND the failed chunk keeps working. Without a boundary React
    // unmounts the whole tree and the terminal goes with it.
    expect(screen.getByText("sibling survives")).toBeTruthy();
    expect(screen.getByText("fallback")).toBeTruthy();
  });
});
