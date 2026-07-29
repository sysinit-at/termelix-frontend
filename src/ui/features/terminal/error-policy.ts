/**
 * What to do with a server `error` frame.
 *
 * This lived inline in `Terminal.tsx` as a chain of `if`s, and it was wrong twice: first by
 * having no resume fallback at all (a refused `resumeBinding` printed a message and left the
 * tab dead), then by the ordering question of whether an auth failure during a resume should
 * still retry. It is pure decision-making with no side effects, so it belongs where it can be
 * tested against the server's actual message strings rather than inferred from a 3000-line
 * component.
 *
 * The component keeps every side effect — closing sockets, clearing the terminal, setting
 * state. This only answers "which of the four things is this".
 */

export type ErrorDisposition =
  /** A resume we asked for was refused. Close and let the reconnect open a fresh shell. */
  | "resume-fallback"
  /** Reachability, not rejection: show it and stop, but do not mark the connection poisoned. */
  | "transient"
  /** Credentials were rejected. Reconnecting would present the same one — stop for good. */
  | "auth-fatal"
  /** Anything else: surface the server's own words and leave the socket alone. */
  | "display";

/**
 * Credential rejection. Kept deliberately broad — the server has no structured error code
 * here, so classification is by message text, and these are the shapes SSH and the port
 * actually produce.
 */
export function isAuthFailure(message: string): boolean {
  const lowered = message.toLowerCase();

  return (
    (lowered.includes("auth") && lowered.includes("failed")) ||
    lowered.includes("permission denied") ||
    (lowered.includes("invalid") &&
      (lowered.includes("password") || lowered.includes("key"))) ||
    lowered.includes("incorrect password")
  );
}

/** A connection-level complaint rather than a refusal of this request. */
export function isTransientFailure(message: string): boolean {
  const lowered = message.toLowerCase();

  return (
    lowered.includes("connection") ||
    lowered.includes("timeout") ||
    lowered.includes("network")
  );
}

/**
 * `resumePending` is the only thing that distinguishes a refused resume from any other error:
 * the server reports both as a plain `error` frame and keeps the socket open, so the client's
 * own memory of having asked is the whole signal.
 *
 * Order matters, and each step earns its place:
 *   1. A pending resume wins — that is the bug this exists to prevent — EXCEPT when the
 *      refusal was about credentials, since a fresh shell would present the same rejected
 *      credential and fail identically.
 *   2. Transient before auth, preserving the original chain: a "connection timeout" is about
 *      reachability even if some substring looks credential-shaped.
 *   3. Auth is terminal.
 *   4. Everything else is displayed.
 */
export function classifyErrorFrame(
  message: string,
  resumePending: boolean,
): ErrorDisposition {
  if (resumePending && !isAuthFailure(message)) return "resume-fallback";
  if (isTransientFailure(message)) return "transient";
  if (isAuthFailure(message)) return "auth-fatal";
  return "display";
}
