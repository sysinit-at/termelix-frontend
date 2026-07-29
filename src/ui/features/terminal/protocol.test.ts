import { describe, expect, it } from "vitest";

import {
  CLIENT_SUPPORTS,
  attachFrame,
  connectFrame,
  frameSeq,
  replayIsReset,
  resumeFrame,
  serverCanResume,
} from "./protocol";

const ctx = {
  cols: 120,
  rows: 40,
  hostConfig: { id: 7, instanceId: "tab-abc", name: "ava" },
};

describe("connectToHost", () => {
  it("carries instanceId inside hostConfig — the only place the server reads it", () => {
    const frame = JSON.parse(connectFrame(ctx));
    expect(frame.data.hostConfig.instanceId).toBe("tab-abc");
  });

  it("advertises support, or the server will never send bindingResumed", () => {
    // `bindingResumed` is gated server-side on this exact list. Without it the resume path
    // completes on the server and the client is never told, which looks like a hang.
    expect(JSON.parse(connectFrame(ctx)).data.supports).toEqual([
      ...CLIENT_SUPPORTS,
    ]);
  });

  it("still passes the connect extras", () => {
    const frame = JSON.parse(
      connectFrame({
        ...ctx,
        initialPath: "/srv",
        executeCommand: "make test",
      }),
    );
    expect(frame.data.initialPath).toBe("/srv");
    expect(frame.data.executeCommand).toBe("make test");
  });
});

describe("resumeBinding — the redeploy path", () => {
  it("asks for the HOST's binding, since the session id is gone by definition", () => {
    const frame = JSON.parse(resumeFrame(ctx, 7));
    expect(frame.type).toBe("resumeBinding");
    expect(frame.data.hostId).toBe(7);
    expect(frame.data.sessionId).toBeUndefined();
  });

  it("advertises support so the bindingResumed reply is not withheld", () => {
    expect(JSON.parse(resumeFrame(ctx, 7)).data.supports).toContain(
      "bindingResumed",
    );
  });
});

describe("attachSession", () => {
  it("names the session and advertises support", () => {
    const frame = JSON.parse(attachFrame(ctx, "sess-1"));
    expect(frame.data.sessionId).toBe("sess-1");
    expect(frame.data.supports).toContain("resumeBinding");
  });
});

describe("serverCanResume", () => {
  it("reads the advertisement the server puts on sessionExpired", () => {
    expect(
      serverCanResume({
        type: "sessionExpired",
        serverSupports: ["resumeBinding"],
      }),
    ).toBe(true);
  });

  it("is false for a server that does not mention it — no version negotiation", () => {
    expect(serverCanResume({ type: "sessionExpired" })).toBe(false);
    expect(
      serverCanResume({ type: "sessionExpired", serverSupports: [] }),
    ).toBe(false);
  });

  it("never throws on junk, because this decides whether a terminal recovers", () => {
    for (const junk of [
      null,
      undefined,
      42,
      "nope",
      [],
      { serverSupports: "yes" },
    ]) {
      expect(serverCanResume(junk)).toBe(false);
    }
  });
});

describe("sequence tracking — reattach costs the delta, not the buffer", () => {
  it("sends the offset it has reached when reattaching to a known session", () => {
    expect(
      JSON.parse(attachFrame({ ...ctx, lastSeq: 4096 }, "s1")).data.lastSeq,
    ).toBe(4096);
  });

  it("sends NO offset on the two frames that open a new stream", () => {
    // Both start a session whose sequence begins at zero, so an offset from the previous
    // stream is not a smaller number in this one — it is a number about something else. A
    // real bug lived here: sent on resume after a server restart, it asked for the delta past
    // a point the new stream had not reached, and the terminal came back blank.
    const withSeq = { ...ctx, lastSeq: 4096 };
    expect("lastSeq" in JSON.parse(connectFrame(withSeq)).data).toBe(false);
    expect("lastSeq" in JSON.parse(resumeFrame(withSeq, 7)).data).toBe(false);
  });

  it("omits the offset entirely when it has none", () => {
    // `lastSeq: null` would be a client claiming position zero. Absent means "I have no
    // position", which is what the server needs to hear to send a full replay.
    expect("lastSeq" in JSON.parse(attachFrame(ctx, "s1")).data).toBe(false);
  });

  it("reads a sequence off a data frame, and refuses anything that is not one", () => {
    expect(frameSeq({ type: "data", seq: 512 })).toBe(512);
    expect(frameSeq({ type: "data", seq: 0 })).toBe(0);

    // An older server omits it. Recording null and sending it back as a position would make
    // the next reattach ask for the whole stream from zero.
    expect(frameSeq({ type: "data" })).toBeNull();
    expect(frameSeq({ type: "data", seq: null })).toBeNull();
    expect(frameSeq({ type: "data", seq: "512" })).toBeNull();
    expect(frameSeq({ type: "data", seq: -1 })).toBeNull();
    expect(frameSeq({ type: "data", seq: NaN })).toBeNull();
    expect(frameSeq(null)).toBeNull();
  });

  it("honours the reset flag, which is what stops a corrupt splice", () => {
    // Set when the buffer was trimmed past the client's position: the two pieces are not
    // adjacent, so appending them would render a screen that never existed.
    expect(replayIsReset({ type: "data", reset: true })).toBe(true);
    expect(replayIsReset({ type: "data", reset: false })).toBe(false);
    expect(replayIsReset({ type: "data" })).toBe(false);
    expect(replayIsReset("nope")).toBe(false);
  });
});
