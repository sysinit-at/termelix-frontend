import { describe, expect, it } from "vitest";

// The module is CommonJS because Electron's main process loads it that way.
import backendMode from "./backend-mode.cjs";

const { shouldStartEmbeddedBackend, shouldStopEmbeddedBackend } = backendMode;

const decide = (overrides = {}) =>
  shouldStartEmbeddedBackend({
    isDev: false,
    serverUrl: null,
    backendRunning: false,
    ...overrides,
  });

describe("shouldStartEmbeddedBackend", () => {
  it("starts for a standalone install", () => {
    // No server configured: the app IS the server, and getApiBase falls back to
    // 127.0.0.1:30003.
    expect(decide()).toBe(true);
  });

  it("does not start when a server is configured", () => {
    // Every request goes to that server; a local backend answers nobody while
    // creating a database, minting keys, initialising Guacamole and downloading
    // a binary.
    expect(decide({ serverUrl: "https://termelix.example.com" })).toBe(false);
  });

  it("starts when the server config is cleared at runtime", () => {
    // The case a launch-only check broke: switching back to standalone left no
    // backend running and the app pointing at a dead local port until restart.
    expect(decide({ serverUrl: null, backendRunning: false })).toBe(true);
  });

  it("does not start a second one when it is already up", () => {
    // Two would fight over the port and the database.
    expect(decide({ backendRunning: true })).toBe(false);
    expect(decide({ backendRunning: true, serverUrl: "https://x" })).toBe(
      false,
    );
  });

  it("never starts in development", () => {
    // `dev:backend` owns it there.
    expect(decide({ isDev: true })).toBe(false);
    expect(decide({ isDev: true, serverUrl: null })).toBe(false);
  });

  it("treats an empty server url as no server", () => {
    // The config is user input; "" must not read as "remote mode" and leave a
    // standalone install with nothing listening.
    expect(decide({ serverUrl: "" })).toBe(true);
  });
});

describe("planForSavedConfig", () => {
  const plan = (overrides = {}) =>
    backendMode.planForSavedConfig({
      isDev: false,
      serverUrl: null,
      backendRunning: false,
      ...overrides,
    });

  it("starts and verifies a fresh standalone switch", () => {
    expect(plan()).toEqual({ start: true, verify: true });
  });

  it("still verifies when the backend is already running", () => {
    // The bug this exists for: a readiness check that failed left the child
    // alive but not listening. Asking only "should I start it?" meant the retry
    // took the already-running path, skipped the check with it, and returned
    // success — the failure reporting itself away on the second attempt.
    expect(plan({ backendRunning: true })).toEqual({
      start: false,
      verify: true,
    });
  });

  it("does neither in remote mode", () => {
    expect(plan({ serverUrl: "https://termelix.example.com" })).toEqual({
      start: false,
      verify: false,
    });
    expect(
      plan({ serverUrl: "https://termelix.example.com", backendRunning: true }),
    ).toEqual({ start: false, verify: false });
  });

  it("does neither in development", () => {
    expect(plan({ isDev: true })).toEqual({ start: false, verify: false });
  });

  it("treats an empty server url as standalone", () => {
    expect(plan({ serverUrl: "" })).toEqual({ start: true, verify: true });
  });
});

describe("shouldStopEmbeddedBackend", () => {
  it("leaves a running backend alone when switching to remote", () => {
    // Start eagerly because the app is broken without it; stop lazily because
    // nothing is broken by its presence, and killing it takes anything
    // mid-flight with it.
    expect(shouldStopEmbeddedBackend()).toBe(false);
  });
});
