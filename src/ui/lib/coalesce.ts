/**
 * Collapse a burst of identical requests into one.
 *
 * Six components independently ask "who am I?" while the app boots — the shell, the dashboard,
 * the login page's post-submit check, the fullscreen wrapper. Each is correct on its own and
 * none can reasonably know about the others, so `/users/me` was fetched three times on every
 * login and `/users/setup-required` twice, each a serial round-trip on the critical path
 * before anything renders.
 *
 * Two mechanisms, because the calls are not all concurrent:
 *
 *   * **in-flight sharing** — a caller arriving while a request is open gets that request's
 *     promise rather than opening a second one;
 *   * **a brief TTL** — a caller arriving just after one resolves (the common shape: a
 *     component mounts in response to the previous answer) gets the settled value.
 *
 * ## Why the TTL is small, and why `invalidate` is not optional
 *
 * This caches *identity*. A cache of who the user is, held across a change of who the user is,
 * hands one account's data to another — so the window is deliberately about as long as a boot
 * sequence and no longer, and every auth transition clears it outright rather than waiting for
 * the window to lapse. The TTL is the optimisation; `invalidate` is the correctness.
 *
 * Rejections are never cached, not even briefly. A failed identity check that answers the next
 * caller from memory turns one dropped request into a spurious logout.
 */

/** Wall-clock source, injectable so tests do not sleep. */
export type Clock = () => number;

export interface Coalescer<T> {
  /** Run `fetcher`, or return the shared in-flight/recent result. */
  get(): Promise<T>;
  /** Drop everything held. Call on every authentication transition. */
  invalidate(): void;
}

export function coalesce<T>(
  fetcher: () => Promise<T>,
  ttlMs: number,
  now: Clock = () => Date.now(),
): Coalescer<T> {
  let inflight: Promise<T> | null = null;
  let settled: { value: T; at: number } | null = null;

  return {
    get(): Promise<T> {
      if (settled && now() - settled.at < ttlMs) {
        return Promise.resolve(settled.value);
      }
      // Stale by time: drop it now rather than leaving it to be overwritten, so a fetcher that
      // then rejects cannot fall back to an answer this call already judged too old.
      settled = null;

      if (inflight) return inflight;

      const request = fetcher().then(
        (value) => {
          // Only record if this request is still the current one. An `invalidate()` during the
          // flight means an auth transition happened while we were asking, and the answer
          // describes whoever was logged in before it.
          if (inflight === request) {
            settled = { value, at: now() };
            inflight = null;
          }
          return value;
        },
        (error) => {
          if (inflight === request) inflight = null;
          throw error;
        },
      );

      inflight = request;
      return request;
    },

    invalidate(): void {
      inflight = null;
      settled = null;
    },
  };
}
