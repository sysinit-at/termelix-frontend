import { describe, it, expect } from "vitest";

import { buildSessionRows, sessionIsRemote, sessionSize } from "./session-rows";
import type {
  TmuxHostOverview,
  TmuxSessionOverview,
} from "@/api/tmux-monitor-api";

function session(
  name: string,
  status?: TmuxSessionOverview["status"],
  windows: TmuxSessionOverview["windows"] = [],
): TmuxSessionOverview {
  return {
    name,
    created: 0,
    lastActivity: 0,
    attachedClients: 0,
    windows,
    tags: [],
    status,
  };
}

function host(
  hostId: number,
  hostName: string,
  sessions: TmuxSessionOverview[],
  available = true,
  error: string | null = null,
): TmuxHostOverview {
  return { hostId, hostName, available, sessions, error };
}

describe("buildSessionRows", () => {
  it("ranks a waiting session above everything, across hosts", () => {
    // The point of the column: a session waiting on input is what you came for. Grouping by host
    // would bury host-b's waiting session under all of host-a's idle ones.
    const { rows } = buildSessionRows([
      host(1, "host-a", [
        session("a-idle", "idle"),
        session("a-run", "running"),
      ]),
      host(2, "host-b", [session("b-waiting", "waiting")]),
    ]);

    expect(rows.map((r) => r.session.name)).toEqual([
      "b-waiting",
      "a-run",
      "a-idle",
    ]);
  });

  it("breaks ties by host then session name, so the order survives a poll", () => {
    const { rows } = buildSessionRows([
      host(2, "host-b", [session("zz", "idle"), session("aa", "idle")]),
      host(1, "host-a", [session("mm", "idle")]),
    ]);

    expect(rows.map((r) => `${r.hostName}/${r.session.name}`)).toEqual([
      "host-a/mm",
      "host-b/aa",
      "host-b/zz",
    ]);
  });

  it("filters on session name and on host name", () => {
    const hosts = [
      host(1, "web-01", [session("deploy"), session("logs")]),
      host(2, "db-01", [session("backup")]),
    ];

    expect(
      buildSessionRows(hosts, "log").rows.map((r) => r.session.name),
    ).toEqual(["logs"]);
    // Matching the host name keeps all of that host's sessions — "show me what is on db-01".
    expect(
      buildSessionRows(hosts, "db-").rows.map((r) => r.session.name),
    ).toEqual(["backup"]);
    expect(buildSessionRows(hosts, "  DEPLOY ").rows).toHaveLength(1);
  });

  it("separates unreachable hosts instead of dropping them", () => {
    const { rows, unavailable } = buildSessionRows([
      host(1, "web-01", [session("deploy")]),
      host(2, "down-01", [], false, "connection refused"),
    ]);

    expect(rows).toHaveLength(1);
    expect(unavailable.map((h) => h.hostName)).toEqual(["down-01"]);
  });

  it("counts every session, not just the ones passing the filter", () => {
    // The header says "3 sessions" while showing one — the total is the fleet's, not the view's.
    const { rows, total } = buildSessionRows(
      [host(1, "web-01", [session("a"), session("b"), session("c")])],
      "a",
    );
    expect(rows).toHaveLength(1);
    expect(total).toBe(3);
  });

  it("handles no data and empty hosts", () => {
    expect(buildSessionRows(null)).toEqual({
      rows: [],
      unavailable: [],
      total: 0,
    });
    expect(buildSessionRows([]).rows).toEqual([]);
  });
});

describe("session shape helpers", () => {
  const withPanes = session("s", "idle", [
    {
      index: 0,
      name: "w0",
      active: true,
      panes: [
        { id: "%1", active: true, isRemote: false, command: "zsh", title: "" },
        { id: "%2", active: false, isRemote: true, command: "ssh", title: "" },
      ],
    },
  ] as TmuxSessionOverview["windows"]);

  it("reports a session with an onward ssh hop as remote", () => {
    expect(sessionIsRemote(withPanes)).toBe(true);
    expect(sessionIsRemote(session("plain"))).toBe(false);
  });

  it("counts windows and panes", () => {
    expect(sessionSize(withPanes)).toEqual({ windows: 1, panes: 2 });
    expect(sessionSize(session("empty"))).toEqual({ windows: 0, panes: 0 });
  });
});
