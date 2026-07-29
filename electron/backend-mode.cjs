/**
 * Whether the embedded Node backend should be running.
 *
 * The desktop app has two modes and can move between them while running:
 *
 *   standalone — no server configured, so the app IS the server: `getApiBase`
 *     falls back to 127.0.0.1:30003 and the embedded backend has to be there;
 *   remote — a Termelix server is configured, every request goes to it, and the
 *     embedded backend answers nobody while still creating a second database,
 *     minting its own keys, initialising the removed Guacamole stack and
 *     downloading an OPKSSH binary.
 *
 * Deciding this only at launch is what the first version did, and it broke the
 * switch that used to work: clearing the server config to go standalone left no
 * backend running and the app pointing at a dead local port until it was
 * restarted. Before the mode existed at all, the backend was unconditional, so
 * that switch always worked — a fix must not take that away.
 *
 * Kept as a pure function so both callers (launch, and the config-save handler)
 * answer the question the same way, and so the live-switch cases can be tested
 * without an Electron process.
 */
function shouldStartEmbeddedBackend({ isDev, serverUrl, backendRunning }) {
  // A separate `dev:backend` process owns this in development.
  if (isDev) return false;
  // Already up: starting a second one would fight over the port and the database.
  if (backendRunning) return false;
  // Remote mode: nothing would talk to it.
  if (serverUrl) return false;
  return true;
}

/**
 * Whether a running backend should be stopped when switching to remote mode.
 *
 * It should not. Stopping is an optimisation and a risk — anything mid-flight
 * through the local backend dies with it — while leaving it costs one idle
 * process until the next launch, which will not start it. The asymmetry is
 * deliberate: start eagerly because the app is broken without it, stop lazily
 * because nothing is broken by its presence.
 */
function shouldStopEmbeddedBackend() {
  return false;
}

/**
 * What saving a server config has to do, as a plan the caller cannot get half
 * right.
 *
 * The first version asked only "should I start the backend?" and verified
 * reachability inside that branch. A readiness check that failed left the child
 * process alive but not listening, so the retry took the "already running"
 * branch, skipped the verification with it, and returned success — the failure
 * reporting itself away on the second attempt.
 *
 * Starting and verifying are separate questions. Going standalone always has to
 * verify; whether it also has to start depends on what is already up.
 */
function planForSavedConfig({ isDev, serverUrl, backendRunning }) {
  // A separate `dev:backend` process owns this in development.
  if (isDev) return { start: false, verify: false };
  // Remote mode: the local API is irrelevant either way.
  if (serverUrl) return { start: false, verify: false };
  return {
    start: shouldStartEmbeddedBackend({ isDev, serverUrl, backendRunning }),
    verify: true,
  };
}

module.exports = {
  shouldStartEmbeddedBackend,
  shouldStopEmbeddedBackend,
  planForSavedConfig,
};
