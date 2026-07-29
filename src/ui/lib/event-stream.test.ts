import { describe, expect, it, vi } from "vitest";

import {
  parseRevoked,
  parseTmuxState,
  parseTmuxTransition,
  subscribeToEvents,
} from "./event-stream";

/**
 * A stand-in for EventSource that lets a test deliver a named frame.
 *
 * The point is the NAME. The server dispatches on `event: tmux_state`, the client listens for a
 * string, and a mismatch produces a listener that is simply never called — no error, no warning,
 * a stream that looks perfectly connected and delivers nothing. Only a test that emits the
 * server's exact names can catch that.
 */
class FakeEventSource {
  listeners = new Map<string, ((event: MessageEvent) => void)[]>();
  closed = false;
  /** 0 CONNECTING, 1 OPEN, 2 CLOSED — the distinction the retry decision turns on. */
  readyState = 1;

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, listener]);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data } as MessageEvent);
    }
  }

  /** A network blip: the browser is retrying on its own, so readyState stays CONNECTING. */
  networkError() {
    this.readyState = 0;
    this.emit("error", "");
  }

  /**
   * An HTTP error — a 401 after revocation, a 503 mid-redeploy.
   *
   * Per spec this "fails the connection": one error event, CLOSED, and the browser never retries.
   * The status is not exposed to script, which is why the two cannot be told apart here.
   */
  httpError() {
    this.readyState = 2;
    this.emit("error", "");
  }
}

/** A subscription with reconnection on and a controllable clock. */
const subscribeReconnecting = (
  handlers: Parameters<typeof subscribeToEvents>[0],
  delays = [10, 20, 40],
) => {
  const sources: FakeEventSource[] = [];
  const scheduled: { callback: () => void; delayMs: number }[] = [];

  const subscription = subscribeToEvents(handlers, {
    factory: () => {
      const source = new FakeEventSource();
      sources.push(source);
      return source as unknown as EventSource;
    },
    reconnectDelaysMs: delays,
    scheduler: (callback, delayMs) => {
      scheduled.push({ callback, delayMs });
      return scheduled.length - 1;
    },
    cancelScheduled: (handle) => {
      const index = handle as number;
      if (scheduled[index]) scheduled[index].callback = () => {};
    },
  });

  return {
    sources,
    scheduled,
    subscription,
    latest: () => sources[sources.length - 1],
    run: () => scheduled[scheduled.length - 1]?.callback(),
  };
};

const subscribe = (handlers: Parameters<typeof subscribeToEvents>[0]) => {
  const source = new FakeEventSource();
  const subscription = subscribeToEvents(handlers, {
    factory: () => source as unknown as EventSource,
    // Off: these cases concern one stream, and a retry would create a second mid-assertion.
    reconnectDelaysMs: [],
  });
  return { source, subscription };
};

describe("event-stream parsing", () => {
  it("reads a tmux_state snapshot", () => {
    const parsed = parseTmuxState(
      JSON.stringify({
        hostId: 7,
        ageMs: 120,
        available: true,
        unwatchable: null,
        sessions: [{ name: "main" }],
      }),
    );

    expect(parsed).toEqual({
      hostId: 7,
      ageMs: 120,
      available: true,
      unwatchable: null,
      sessions: [{ name: "main" }],
    });
  });

  it("refuses a snapshot with no host, rather than defaulting it", () => {
    // Defaulting hostId to 0 would attribute one host's sessions to another — a wrong screen
    // that looks entirely plausible.
    expect(parseTmuxState(JSON.stringify({ ageMs: 5 }))).toBeNull();
    expect(parseTmuxState(JSON.stringify({ hostId: "7" }))).toBeNull();
    expect(parseTmuxState("not json")).toBeNull();
  });

  it("treats a missing availability as unavailable", () => {
    // `available` gates whether the UI claims a host is being watched. Absent must not read as
    // true, or a host nobody is monitoring is shown as monitored.
    const parsed = parseTmuxState(JSON.stringify({ hostId: 1 }));
    expect(parsed?.available).toBe(false);
    expect(parsed?.sessions).toEqual([]);
  });

  it("reads a transition", () => {
    const parsed = parseTmuxTransition(
      JSON.stringify({ hostId: 3, paneId: "%4", from: "busy", to: "idle" }),
    );
    expect(parsed).toEqual({
      hostId: 3,
      paneId: "%4",
      from: "busy",
      to: "idle",
    });
  });

  it("refuses a transition with no destination", () => {
    // The destination IS the news — "a pane changed to nothing" would fire a notification with
    // no content.
    expect(
      parseTmuxTransition(JSON.stringify({ hostId: 3, from: "busy" })),
    ).toBeNull();
    expect(
      parseTmuxTransition(JSON.stringify({ hostId: 3, to: "" })),
    ).toBeNull();
  });

  it("always yields a revocation reason, even from a broken payload", () => {
    expect(parseRevoked(JSON.stringify({ reason: "admin removed you" }))).toBe(
      "admin removed you",
    );
    // The EVENT is the signal; the reason only explains it. A parse failure must not downgrade
    // a revocation into silence.
    expect(parseRevoked("{{{")).toBe("revoked");
    expect(parseRevoked(JSON.stringify({}))).toBe("revoked");
    expect(parseRevoked(JSON.stringify({ reason: "" }))).toBe("revoked");
  });
});

describe("event-stream subscription", () => {
  it("dispatches on the exact event names the server emits", () => {
    const onReady = vi.fn();
    const onTmuxState = vi.fn();
    const onTmuxTransition = vi.fn();
    const { source } = subscribe({ onReady, onTmuxState, onTmuxTransition });

    source.emit("ready", JSON.stringify({ userId: "u1" }));
    source.emit("tmux_state", JSON.stringify({ hostId: 2, available: true }));
    source.emit(
      "tmux_transition",
      JSON.stringify({ hostId: 2, paneId: "%1", from: "a", to: "b" }),
    );

    expect(onReady).toHaveBeenCalledWith("u1");
    expect(onTmuxState).toHaveBeenCalledWith(
      expect.objectContaining({ hostId: 2, available: true }),
    );
    expect(onTmuxTransition).toHaveBeenCalledWith(
      expect.objectContaining({ paneId: "%1", to: "b" }),
    );
  });

  it("does not invoke handlers for unparseable frames", () => {
    const onTmuxState = vi.fn();
    const { source } = subscribe({ onTmuxState });

    source.emit("tmux_state", "not json");
    source.emit("tmux_state", JSON.stringify({ ageMs: 1 }));

    expect(onTmuxState).not.toHaveBeenCalled();
  });

  it("closes the stream on revocation, which is the security property", () => {
    const onRevoked = vi.fn();
    const { source } = subscribe({ onRevoked });

    source.emit("revoked", JSON.stringify({ reason: "access withdrawn" }));

    expect(onRevoked).toHaveBeenCalledWith("access withdrawn");
    // By the time this frame arrives the server has torn down every session, tunnel and
    // connection this user held; the stream is the one survivor, and leaving it open leaves a
    // channel delivering data for an account with no access.
    expect(source.closed).toBe(true);
  });

  it("leaves a network error to the browser's own retry", () => {
    const onError = vi.fn();
    const { source } = subscribe({ onError });

    source.networkError();

    expect(onError).toHaveBeenCalled();
    // readyState CONNECTING means the browser is already reconnecting with Last-Event-ID.
    // Closing here would replace an automatic recovery with a permanent outage.
    expect(source.closed).toBe(false);
  });

  it("can be closed by the caller", () => {
    const { source, subscription } = subscribe({});
    subscription.close();
    expect(source.closed).toBe(true);
  });
});

describe("reconnection after the browser gives up", () => {
  it("reopens a stream closed by an HTTP error", () => {
    // The gap this closes: `EventSource` retries network failures but NOT HTTP ones. A 401 once
    // access is withdrawn, or a 503 during a redeploy, fires one error and leaves the stream
    // CLOSED forever — the page looked healthy and silently stopped being told anything.
    const stream = subscribeReconnecting({});

    stream.latest().httpError();
    expect(stream.scheduled).toHaveLength(1);

    stream.run();
    expect(stream.sources).toHaveLength(2);
  });

  it("does NOT reopen on a network error, which the browser handles", () => {
    const stream = subscribeReconnecting({});

    stream.latest().networkError();

    // Racing the browser's own retry would open a second stream against a server that caps them.
    expect(stream.scheduled).toHaveLength(0);
    expect(stream.sources).toHaveLength(1);
  });

  it("schedules one retry however many times error fires", () => {
    const stream = subscribeReconnecting({});

    stream.latest().httpError();
    stream.latest().httpError();
    stream.latest().httpError();

    expect(stream.scheduled).toHaveLength(1);
  });

  it("backs off, then holds", () => {
    const stream = subscribeReconnecting({}, [10, 20, 40]);

    for (let i = 0; i < 4; i += 1) {
      stream.latest().httpError();
      stream.run();
    }

    expect(stream.scheduled.map((s) => s.delayMs)).toEqual([10, 20, 40, 40]);
  });

  it("resets the backoff only once a frame arrives", () => {
    const stream = subscribeReconnecting({}, [10, 20, 40]);

    stream.latest().httpError();
    stream.run();
    stream.latest().httpError();
    stream.run();
    expect(stream.scheduled.map((s) => s.delayMs)).toEqual([10, 20]);

    stream.latest().emit("ready", JSON.stringify({ userId: "u1" }));
    stream.latest().httpError();
    expect(stream.scheduled.map((s) => s.delayMs)).toEqual([10, 20, 10]);
  });

  it("delivers events on a reopened stream", () => {
    const onRevoked = vi.fn();
    const stream = subscribeReconnecting({ onRevoked });

    stream.latest().httpError();
    stream.run();
    stream.latest().emit("revoked", JSON.stringify({ reason: "withdrawn" }));

    expect(onRevoked).toHaveBeenCalledWith("withdrawn");
  });

  it("does NOT reopen after a revocation", () => {
    const stream = subscribeReconnecting({});

    stream.latest().emit("revoked", JSON.stringify({ reason: "withdrawn" }));
    stream.latest().httpError();

    // Access is gone; reopening would be a loop of refusals.
    expect(stream.scheduled).toHaveLength(0);
    expect(stream.sources).toHaveLength(1);
  });

  it("does NOT reopen after the caller closes it", () => {
    const stream = subscribeReconnecting({});

    stream.subscription.close();
    stream.latest().httpError();

    expect(stream.scheduled).toHaveLength(0);
    expect(stream.sources).toHaveLength(1);
  });

  it("cancels a pending retry when closed mid-backoff", () => {
    const stream = subscribeReconnecting({});

    stream.latest().httpError();
    stream.subscription.close();
    stream.run();

    expect(stream.sources).toHaveLength(1);
  });
});
