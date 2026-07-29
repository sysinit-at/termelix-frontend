const http = require("http");

/** The port `getApiBase` falls back to in standalone mode. */
const LOCAL_API_PORT = 30003;

/**
 * Whether the local API is accepting connections.
 *
 * Any HTTP response counts, including 404: the question is whether something is
 * listening, not whether a particular route exists.
 */
function localApiAnswers({ port = LOCAL_API_PORT, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve(true);
      },
    );
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait until the local API answers, or give up.
 *
 * `startBackendServer` cannot be trusted to mean this. It resolves `true` on a
 * 15-second timer — "Backend ready timeout (15s), proceeding anyway" — and
 * otherwise on a string appearing in the child's stdout. Both are proxies: the
 * first is explicitly a guess, and the second says the process printed
 * something, not that a socket is accepting connections. Awaiting it and then
 * telling the renderer the switch succeeded was a guarantee that could be false.
 *
 * Asking the port directly is the only version of this claim that is true when
 * it is made.
 */
async function waitForLocalApi({
  port = LOCAL_API_PORT,
  timeoutMs = 20_000,
  intervalMs = 250,
  now = () => Date.now(),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const deadline = now() + timeoutMs;

  for (;;) {
    if (await localApiAnswers({ port })) return true;
    if (now() >= deadline) return false;
    await sleep(intervalMs);
  }
}

module.exports = { LOCAL_API_PORT, localApiAnswers, waitForLocalApi };
