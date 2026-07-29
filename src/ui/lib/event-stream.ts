/**
 * The `/events` server-push channel, as a pure module.
 *
 * Everything in this app was pull: the monitor polled, the terminal polled, and a state change
 * reached a human only when their browser next happened to ask. "Dispatch a command, walk away,
 * get told when it needs you" cannot be built on that — a client that has to ask cannot be told.
 *
 * The server's side is `TermelixWeb.EventController`. It speaks ordinary SSE, so the stream
 * inherits the JWT cookie and the reverse proxy's existing configuration, and the browser
 * replays `Last-Event-ID` without a line of code here.
 *
 * The browser's reconnection is only PARTIAL, which is easy to over-trust: `EventSource` retries a
 * network failure on its own, but per spec any response that is not 200 with `text/event-stream`
 * "fails the connection" — one `error` event, `readyState` CLOSED, no retry ever. A 401 after
 * access is withdrawn and a 503 during a redeploy both land there, so the subscription died
 * permanently and silently while the page looked perfectly healthy. Hence the backoff below.
 *
 * ## What this module is for
 *
 * Parsing and dispatch, with no DOM and no React, because the interesting failures are all in
 * this layer and none of them are visible in a component test:
 *
 *   * an event name that does not match what the server emits — the handler simply never fires,
 *     and a stream that looks connected and delivers nothing is the worst failure mode there is;
 *   * a payload field that has been renamed — `undefined` flows into the UI as a blank value
 *     rather than an error;
 *   * `revoked`, which is a security event: the server has torn down everything else this user
 *     held and the stream is the one survivor. A client that ignores it keeps showing data for
 *     an account that no longer has access.
 *
 * The poll stays. This is an addition, and a client that fails to subscribe keeps working
 * exactly as it did — which is also why a silent subscription failure needs to be detectable
 * rather than merely survivable.
 */

/** A tmux snapshot for one host, as `encode_snapshot/2` emits it. */
export interface TmuxStateEvent {
  hostId: number;
  ageMs: number;
  available: boolean;
  unwatchable: string | null;
  sessions: unknown[];
}

/** A pane changing state — the event a human is actually waiting for. */
export interface TmuxTransitionEvent {
  hostId: number;
  paneId: string;
  from: string;
  to: string;
}

export interface EventStreamHandlers {
  /** The stream is live. Sent once, before any state. */
  onReady?: (userId: string) => void;
  onTmuxState?: (event: TmuxStateEvent) => void;
  onTmuxTransition?: (event: TmuxTransitionEvent) => void;
  /**
   * Access has been withdrawn mid-stream.
   *
   * Not merely informational: by the time this arrives the server has already torn down every
   * session, tunnel and connection this user held, and this stream is the only thing left. The
   * handler is expected to end the session locally too.
   */
  onRevoked?: (reason: string) => void;
  /**
   * Transport-level failure.
   *
   * Fires for both kinds: the ones the browser retries itself, and the ones it gives up on (which
   * this module then reopens). Informational either way — nothing needs to act on it.
   */
  onError?: () => void;
}

/** Injectable so tests need no browser and no server. */
export type EventSourceFactory = (url: string) => EventSource;

/**
 * Backoff for reopening a stream the browser has given up on, in ms; the last value repeats.
 *
 * `EventSource` reconnects itself after a NETWORK error, which is why this looked unnecessary.
 * It does not reconnect after an HTTP one: per spec any response that is not 200 with
 * `text/event-stream` "fails the connection", fires `error` once, and leaves `readyState` at
 * CLOSED for good. So a 401 after access is withdrawn, or a 503 while the server is restarting,
 * killed the subscription permanently and silently — the page looked fine and simply stopped
 * being told anything.
 */
const DEFAULT_RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export interface EventStreamSubscription {
  close(): void;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

/**
 * Parse a `tmux_state` frame.
 *
 * Returns null rather than a partly-filled object when `hostId` is missing or not a number:
 * without it the snapshot cannot be attributed to a host, and defaulting it to 0 would apply
 * one host's state to another.
 */
export function parseTmuxState(raw: string): TmuxStateEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = asRecord(payload);
  if (!record || typeof record.hostId !== "number") return null;

  return {
    hostId: record.hostId,
    ageMs: asNumber(record.ageMs, 0),
    available: record.available === true,
    unwatchable:
      typeof record.unwatchable === "string" ? record.unwatchable : null,
    sessions: Array.isArray(record.sessions) ? record.sessions : [],
  };
}

/**
 * Parse a `tmux_transition` frame.
 *
 * `from`/`to` are required as strings: a transition with an empty destination says nothing about
 * what happened, and forwarding it would fire a notification with no content.
 */
export function parseTmuxTransition(raw: string): TmuxTransitionEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = asRecord(payload);
  if (!record || typeof record.hostId !== "number") return null;
  if (typeof record.to !== "string" || record.to === "") return null;

  return {
    hostId: record.hostId,
    paneId: asString(record.paneId),
    from: asString(record.from),
    to: record.to,
  };
}

/** The reason from a `revoked` frame. Defaults to a non-empty string, never to silence. */
export function parseRevoked(raw: string): string {
  try {
    const record = asRecord(JSON.parse(raw));
    const reason = record?.reason;
    return typeof reason === "string" && reason !== "" ? reason : "revoked";
  } catch {
    // A malformed payload must not turn a revocation into a no-op. The event ITSELF is the
    // signal; the reason is only there to explain it to the operator.
    return "revoked";
  }
}

/**
 * Subscribe to `/events`.
 *
 * The event names below are a contract with the server, matched by string. A typo produces a
 * listener that is never called — no error anywhere — so they exist once, here, rather than
 * being spelled out at each call site.
 */
export function subscribeToEvents(
  handlers: EventStreamHandlers,
  options: {
    url?: string;
    factory?: EventSourceFactory;
    reconnectDelaysMs?: number[];
    scheduler?: (callback: () => void, delayMs: number) => unknown;
    cancelScheduled?: (handle: unknown) => void;
  } = {},
): EventStreamSubscription {
  const url = options.url ?? "/events";
  const factory =
    options.factory ??
    ((target: string) => new EventSource(target, { withCredentials: true }));
  const delays = options.reconnectDelaysMs ?? DEFAULT_RECONNECT_DELAYS_MS;
  const schedule =
    options.scheduler ??
    ((callback: () => void, delayMs: number) => setTimeout(callback, delayMs));
  const cancelSchedule =
    options.cancelScheduled ??
    ((handle: unknown) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>));

  let closed = false;
  let attempt = 0;
  let pending: unknown = null;
  let source: EventSource;

  const retry = () => {
    // One at a time: `error` can fire more than once for the same dead stream, and a timer per
    // occurrence would open several and multiply them on every subsequent failure.
    if (closed || pending !== null || delays.length === 0) return;

    const delay = delays[Math.min(attempt, delays.length - 1)];
    attempt += 1;
    pending = schedule(() => {
      pending = null;
      if (!closed) open();
    }, delay);
  };

  function open(): void {
    source = factory(url);
    wire(source);
  }

  function wire(source: EventSource): void {
    const arrived = () => {
      // Reset only when something actually ARRIVES. Resetting on open would make a stream that
      // connects and immediately fails retry in a tight loop forever.
      attempt = 0;
    };

    source.addEventListener("ready", (event) => {
      arrived();
      const record = asRecord(safeParse((event as MessageEvent).data));
      handlers.onReady?.(asString(record?.userId));
    });

    source.addEventListener("tmux_state", (event) => {
      arrived();
      const parsed = parseTmuxState((event as MessageEvent).data);
      if (parsed) handlers.onTmuxState?.(parsed);
    });

    source.addEventListener("tmux_transition", (event) => {
      arrived();
      const parsed = parseTmuxTransition((event as MessageEvent).data);
      if (parsed) handlers.onTmuxTransition?.(parsed);
    });

    source.addEventListener("revoked", (event) => {
      // Handled before anything else can matter, and deliberately not guarded by a successful
      // parse — see parseRevoked.
      // Access is gone: stop for good rather than reconnecting into a loop of refusals.
      closed = true;
      handlers.onRevoked?.(parseRevoked((event as MessageEvent).data));
      source.close();
    });

    source.addEventListener("error", () => {
      if (closed) return;
      handlers.onError?.();

      // CONNECTING means the browser is already retrying a network failure on its own; leaving it
      // to do that is strictly better than racing it. CLOSED means it has given up permanently,
      // which is what an HTTP error looks like from here.
      if (source.readyState === 2 /* CLOSED */) {
        // EventSource does not expose the status, so a withdrawn credential and a restarting
        // server are indistinguishable at this point. Reopening is right for both: a 401 will be
        // refused again and the app's existing auth handling picks it up on the next request,
        // whereas treating every closed stream as a sign-out would log people out during a
        // redeploy.
        source.close();
        retry();
      }
    });
  }

  open();

  return {
    close: () => {
      closed = true;
      if (pending !== null) {
        cancelSchedule(pending);
        pending = null;
      }
      source.close();
    },
  };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
