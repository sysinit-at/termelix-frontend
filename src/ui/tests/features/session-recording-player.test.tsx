import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";

import type { SessionLogRecord } from "@/api/session-log-api";

// The asciicast player mounts xterm, which needs a real canvas — irrelevant to the fallback
// under test, so it is stubbed out.
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    write() {}
    reset() {}
    dispose() {}
    resize() {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit() {}
  },
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { SessionRecordingPlayer } from "@/features/session-recording/SessionRecordingPlayer";

function log(format: SessionLogRecord["format"]): SessionLogRecord {
  return {
    id: 1,
    hostId: 1,
    userId: "u1",
    startedAt: "2026-01-01T00:00:00Z",
    endedAt: null,
    duration: null,
    recordingPath: null,
    hostName: "web-1",
    hostIp: "10.0.0.1",
    sizeBytes: 10,
    protocol: "rdp",
    format,
    username: "root",
  };
}

describe("SessionRecordingPlayer", () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; the asciicast player installs one on mount.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it("explains that a legacy Guacamole recording can no longer be played", () => {
    render(
      <SessionRecordingPlayer
        log={log("guacamole")}
        blob={new Blob(["irrelevant"])}
      />,
    );

    expect(
      screen.getByText("sessionLogs.guacamoleFormatUnsupported"),
    ).toBeTruthy();
  });

  it("does not show the fallback for an asciicast recording", () => {
    render(
      <SessionRecordingPlayer log={log("asciicast")} blob={new Blob(["[]"])} />,
    );

    expect(screen.queryByText("sessionLogs.guacamoleFormatUnsupported")).toBe(
      null,
    );
  });
});
