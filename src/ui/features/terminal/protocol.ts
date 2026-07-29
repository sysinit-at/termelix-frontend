/**
 * The terminal WebSocket protocol, as pure functions.
 *
 * These frames are a contract with the server (`lib/termelix_web/terminal_socket.ex`), and the
 * server ignores whatever it does not understand — so a misplaced or missing field does not
 * error, it silently stops doing the thing it was for. That failure mode is why this is a
 * separate, importless module with its own tests rather than string literals scattered through
 * a 3000-line component.
 *
 * The mobile client has the same module, deliberately: two clients that build the same frames
 * from two hand-written copies is how they drift, and they already had.
 */

/**
 * Frames this client understands.
 *
 * The server gates `bindingResumed` on it — a client that does not advertise it never receives
 * the frame — so this is what makes the resume path reachable at all.
 */
export const CLIENT_SUPPORTS = ["resumeBinding", "bindingResumed"] as const;

export interface FrameContext {
  cols: number;
  rows: number;
  /**
   * The stream offset this client has already rendered in the session it is reattaching to.
   *
   * The server keeps a monotonic byte count per session and can answer a reattach with just
   * the delta. Without it every reattach replays the whole scrollback — up to 512 KB, re-sent
   * and re-rendered however briefly the client was away, which on a roaming connection is the
   * difference between reconnecting invisibly and stuttering.
   *
   * Read by `attachFrame` alone. The other two frames open a NEW stream, whose sequence starts
   * at zero, so a position carried into them is a position in something that no longer exists.
   */
  lastSeq?: number;
  /** The host record as the server's `hostConfig`; must carry `instanceId` for per-tab tmux. */
  hostConfig: Record<string, unknown> & { id?: number; instanceId?: string };
  initialPath?: string;
  executeCommand?: string;
  tmuxAttachSession?: string;
}

/** `connectToHost` — open a shell. */
export function connectFrame(ctx: FrameContext): string {
  return JSON.stringify({
    type: "connectToHost",
    data: {
      cols: ctx.cols,
      rows: ctx.rows,
      hostConfig: ctx.hostConfig,
      initialPath: ctx.initialPath,
      executeCommand: ctx.executeCommand,
      tmuxAttachSession: ctx.tmuxAttachSession,
      supports: CLIENT_SUPPORTS,
    },
  });
}

/** `attachSession` — reattach to a BEAM session this tab already knows about. */
export function attachFrame(ctx: FrameContext, sessionId: string): string {
  return JSON.stringify({
    type: "attachSession",
    data: {
      sessionId,
      cols: ctx.cols,
      rows: ctx.rows,
      tabInstanceId: ctx.hostConfig.instanceId,
      lastSeq: ctx.lastSeq,
      supports: CLIENT_SUPPORTS,
    },
  });
}

/**
 * `resumeBinding` — reattach to the remote TMUX session this host was last bound to.
 *
 * The redeploy path, and the reason the whole binding exists. The BEAM session died with the
 * container; the tmux session on the host did not, and whatever the operator (or their agent)
 * was running is still running in it. Going straight to `connectToHost` here opens a brand new
 * shell and silently discards all of it.
 */
export function resumeFrame(ctx: FrameContext, hostId: number): string {
  return JSON.stringify({
    type: "resumeBinding",
    data: {
      hostId,
      cols: ctx.cols,
      rows: ctx.rows,
      // Deliberately no `lastSeq`. This frame is sent precisely BECAUSE the old session is
      // gone; the server builds a new one bound to the same tmux, and its stream starts at
      // zero. An offset earned in the dead stream is not a position in this one.
      supports: CLIENT_SUPPORTS,
    },
  });
}

/**
 * Whether the server that sent this `sessionExpired` can resume a tmux binding.
 *
 * The frame carries `serverSupports` precisely so no version negotiation is needed: an older
 * server simply does not mention it, and the client falls back to a fresh shell.
 */
export function serverCanResume(message: unknown): boolean {
  if (typeof message !== "object" || message === null) return false;
  const supports = (message as { serverSupports?: unknown }).serverSupports;
  return Array.isArray(supports) && supports.includes("resumeBinding");
}

/**
 * The stream offset carried by a `data` frame, if the server sent one.
 *
 * Omitted rather than null by an older server, and a client must not record `null` and then
 * send it back as its position — hence the explicit integer check.
 */
export function frameSeq(message: unknown): number | null {
  if (typeof message !== "object" || message === null) return null;
  const seq = (message as { seq?: unknown }).seq;
  return typeof seq === "number" && Number.isFinite(seq) && seq >= 0
    ? seq
    : null;
}

/**
 * Whether a replay must CLEAR the terminal before being written.
 *
 * The server says so when it could not produce a delta — the buffer was trimmed past where the
 * client had reached, so what it is sending is not a continuation. Appending it would splice
 * two non-adjacent parts of the stream together and render a screen that never existed.
 */
export function replayIsReset(message: unknown): boolean {
  if (typeof message !== "object" || message === null) return false;
  return (message as { reset?: unknown }).reset === true;
}
