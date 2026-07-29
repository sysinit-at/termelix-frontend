import React, { Component, Suspense, lazy } from "react";
import type { ComponentType, LazyExoticComponent, ReactNode } from "react";

/**
 * Lazy-loading that survives a deploy.
 *
 * A fingerprinted chunk is only fetched when it is first needed, and a deploy replaces
 * `priv/static/spa` wholesale — so a page that has been open across a deploy is holding
 * references to filenames that **no longer exist**. The import 404s, `React.lazy` throws
 * during render, and with no error boundary anywhere in this app React unmounts the entire
 * tree: a blank page.
 *
 * That is not hypothetical for a self-hosted tool whose whole update story is
 * `docker compose up -d` while people have tabs open. And it is worst for the rarest chunks —
 * the SSH auth dialog appears only when a server asks for credentials, so the failure lands
 * exactly when someone is trying to get back into a host, and it has had the least exposure
 * to notice the problem.
 *
 * Three steps, in order of how likely each cause is:
 *
 *   1. **Retry once.** A single failed request is more often a blip than a deploy.
 *   2. **Reload the page.** If the chunk is really gone, this page is stale in every other way
 *      too, and a reload fetches the new `index.html` with the new filenames. Safe in a way it
 *      would not have been before the tmux binding: a reconnecting terminal now resumes its
 *      remote session rather than opening a fresh shell.
 *   3. **Give up visibly.** Guarded by `sessionStorage` so a genuinely broken build reloads
 *      once and then shows an error, instead of reloading forever.
 */

const RELOAD_GUARD_PREFIX = "termelix_chunk_reload:";

function alreadyReloadedFor(name: string): boolean {
  try {
    return sessionStorage.getItem(RELOAD_GUARD_PREFIX + name) === "1";
  } catch {
    // Storage can be unavailable (private mode, embedded webview). Treat that as "already
    // reloaded": refusing to reload is the safe direction — a reload loop is worse than a
    // visible error.
    return true;
  }
}

function markReloadedFor(name: string): void {
  try {
    sessionStorage.setItem(RELOAD_GUARD_PREFIX + name, "1");
  } catch {
    // See above.
  }
}

/** Exported for tests; clears the once-per-session reload guard. */
export function resetChunkReloadGuard(name: string): void {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_PREFIX + name);
  } catch {
    // ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyChunk<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (first) {
      // A blip, most likely. One retry costs a round trip and resolves the common case.
      try {
        return await factory();
      } catch (second) {
        if (!alreadyReloadedFor(name)) {
          markReloadedFor(name);
          window.location.reload();
          // Never resolves — the page is going away. Resolving with a placeholder would race
          // the reload and flash something misleading.
          return await new Promise<{ default: T }>(() => {});
        }

        console.error(
          `[lazyChunk] ${name} could not be loaded after a reload`,
          first,
          second,
        );
        throw second;
      }
    }
  });
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Named so a console error says which chunk died. */
  name: string;
}

/**
 * A last-resort boundary so a failed chunk cannot take the whole app down with it.
 *
 * `lazyChunk` should make this unreachable in the deploy case; it exists because "unreachable"
 * and "unreached" are different claims, and the cost of being wrong here is a blank page over
 * somebody's live terminal.
 */
export class ChunkErrorBoundary extends Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[ChunkErrorBoundary] ${this.props.name} failed`, error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}

/** `lazyChunk` + `Suspense` + a boundary, which is how it should almost always be used. */
export function LazyBoundary({
  name,
  children,
  fallback = null,
}: {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ChunkErrorBoundary name={name} fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}
