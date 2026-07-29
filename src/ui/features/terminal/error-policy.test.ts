import { describe, expect, it } from "vitest";

import {
  classifyErrorFrame,
  isAuthFailure,
  isTransientFailure,
} from "./error-policy";

/**
 * The messages below are the server's, not invented: `resolve_binding/2` and
 * `ensure_session_live/3` in `terminal_socket.ex` produce the two resume refusals, and the
 * auth strings are what the SSH layer surfaces. Testing against paraphrases would have missed
 * the original bug entirely — the defect was precisely that
 * "No tmux session is bound to this host" matches none of the keyword branches and fell
 * through to a tail that did nothing.
 */

const NO_BINDING = "No tmux session is bound to this host";
const SESSION_GONE = "That tmux session is no longer running on the host";

describe("classifyErrorFrame", () => {
  describe("a resume the server refused", () => {
    it("falls back to a fresh shell when no binding exists", () => {
      // The common case, and it needs no tmux at all: a host tmux never wrapped has no
      // binding row, so every redeploy produced this.
      expect(classifyErrorFrame(NO_BINDING, true)).toBe("resume-fallback");
    });

    it("falls back when the remote tmux session died", () => {
      expect(classifyErrorFrame(SESSION_GONE, true)).toBe("resume-fallback");
    });

    it("falls back even when the refusal reads as a connection fault", () => {
      // A transient `ensure_session_live` probe failure refuses the resume too. Falling back
      // is still right: the binding may be fine, and a fresh shell is better than a dead tab.
      expect(classifyErrorFrame("Connection timeout", true)).toBe(
        "resume-fallback",
      );
    });

    it("does NOT fall back when the refusal was about credentials", () => {
      // The one exception. A fresh connect would present the same rejected credential, so
      // retrying just fails twice and hides why.
      expect(classifyErrorFrame("Permission denied (publickey)", true)).toBe(
        "auth-fatal",
      );
      expect(classifyErrorFrame("Authentication failed", true)).toBe(
        "auth-fatal",
      );
    });
  });

  describe("with no resume in flight", () => {
    it("treats the same refusal messages as ordinary display errors", () => {
      // This is the pre-fix behaviour for these strings, and it is correct HERE: without a
      // pending resume nothing asked for a binding, so there is nothing to fall back from.
      expect(classifyErrorFrame(NO_BINDING, false)).toBe("display");
      expect(classifyErrorFrame(SESSION_GONE, false)).toBe("display");
    });

    it("classifies reachability complaints as transient", () => {
      expect(classifyErrorFrame("Connection refused", false)).toBe("transient");
      expect(classifyErrorFrame("Connection timeout", false)).toBe("transient");
      expect(classifyErrorFrame("Network unreachable", false)).toBe(
        "transient",
      );
    });

    it("classifies credential rejections as fatal", () => {
      expect(classifyErrorFrame("Permission denied (publickey)", false)).toBe(
        "auth-fatal",
      );
      expect(classifyErrorFrame("Authentication failed", false)).toBe(
        "auth-fatal",
      );
      expect(classifyErrorFrame("Incorrect password", false)).toBe(
        "auth-fatal",
      );
      expect(classifyErrorFrame("Invalid private key", false)).toBe(
        "auth-fatal",
      );
    });

    it("displays anything it does not recognise", () => {
      expect(classifyErrorFrame("Host not found", false)).toBe("display");
      expect(classifyErrorFrame("", false)).toBe("display");
    });
  });

  it("keeps transient ahead of auth, as the original chain did", () => {
    // "connection" wins over the credential-shaped substring. Pinned because reordering these
    // two silently changes whether the socket is marked poisoned.
    expect(classifyErrorFrame("Connection closed: invalid key", false)).toBe(
      "transient",
    );
  });
});

describe("isAuthFailure", () => {
  it("matches the shapes the SSH layer produces", () => {
    expect(isAuthFailure("Authentication failed")).toBe(true);
    expect(isAuthFailure("permission denied")).toBe(true);
    expect(isAuthFailure("Invalid password")).toBe(true);
    expect(isAuthFailure("Invalid key")).toBe(true);
    expect(isAuthFailure("Incorrect password")).toBe(true);
  });

  it("does not claim the resume refusals", () => {
    // The whole defect in one assertion: these carry no auth keyword, so the auth branch
    // never caught them and they fell through to a tail that only printed.
    expect(isAuthFailure(NO_BINDING)).toBe(false);
    expect(isAuthFailure(SESSION_GONE)).toBe(false);
  });

  it("does not treat a bare 'auth' or 'invalid' as a rejection", () => {
    // Both halves are required, so a message merely mentioning auth is not a credential
    // failure — otherwise a recoverable error would permanently poison the socket.
    expect(isAuthFailure("auth in progress")).toBe(false);
    expect(isAuthFailure("Invalid host id")).toBe(false);
  });
});

describe("isTransientFailure", () => {
  it("matches reachability wording", () => {
    expect(isTransientFailure("Connection refused")).toBe(true);
    expect(isTransientFailure("timeout waiting for shell")).toBe(true);
    expect(isTransientFailure("network is down")).toBe(true);
  });

  it("leaves the resume refusals alone", () => {
    expect(isTransientFailure(NO_BINDING)).toBe(false);
    expect(isTransientFailure(SESSION_GONE)).toBe(false);
  });
});
