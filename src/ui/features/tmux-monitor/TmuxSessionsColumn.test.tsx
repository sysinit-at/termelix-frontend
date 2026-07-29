import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TmuxSessionsColumn } from "./TmuxSessionsColumn";
import type { Host } from "@/types/ui-types";

/**
 * The all-hosts endpoint fans an SSH probe out to every tmux-enabled host. That makes the number
 * of times this column calls it a workload question, not a rendering detail: the column is part
 * of the shell now, so every extra call is another burst of connections across the whole fleet.
 */
const api = vi.hoisted(() => {
  // One resolver PER call, not one shared slot. With a single slot, resolving "the" probe after
  // a second one had started actually resolved the second — so a test could assert that a stale
  // response never painted while never delivering the stale response at all.
  const pending: ((value: unknown) => void)[] = [];
  return {
    getTmuxOverviewAll: vi.fn(
      () => new Promise((resolve) => pending.push(resolve)),
    ),
    getTmuxOverview: vi.fn(async () => ({ available: true, sessions: [] })),
    /** Resolve the nth outstanding fleet probe, oldest first. */
    settleCall: (index: number, value: unknown = []) => pending[index]?.(value),
    settleAll: (value: unknown = []) => pending.forEach((r) => r(value)),
    pendingCount: () => pending.length,
    reset: () => (pending.length = 0),
  };
});

vi.mock("@/api/tmux-monitor-api", () => api);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const hosts: Host[] = [
  { id: "1", name: "web-01", enableTmuxMonitor: true } as Host,
  { id: "2", name: "db-01", enableTmuxMonitor: true } as Host,
];

function session(hostName: string, sessionName: string) {
  return {
    hostId: 1,
    hostName,
    available: true,
    sessions: [
      {
        name: sessionName,
        created: 0,
        lastActivity: 0,
        attachedClients: 0,
        windows: [],
        tags: [],
      },
    ],
    error: null,
  };
}

function column(
  props: Partial<React.ComponentProps<typeof TmuxSessionsColumn>>,
) {
  return (
    <TmuxSessionsColumn
      hosts={hosts}
      selectedHostIds={new Set()}
      onShowAll={vi.fn()}
      onAttach={vi.fn()}
      width={260}
      onResizeStart={vi.fn()}
      userId="alice"
      readiness="ready"
      onRetry={vi.fn()}
      {...props}
    />
  );
}

function renderColumn(selected: string[] = []) {
  return render(column({ selectedHostIds: new Set(selected) }));
}

describe("TmuxSessionsColumn — probe workload", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.reset();
    api.getTmuxOverviewAll.mockClear();
    api.getTmuxOverview.mockClear();
  });

  afterEach(() => api.settleAll([]));

  it("probes the fleet once on mount", async () => {
    renderColumn();
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );
  });

  it("does not start a second fleet probe while one is running", async () => {
    const { rerender } = renderColumn();
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    // A burst of selection changes ending back at "all hosts" — clicking a host on and off is
    // enough to produce this. Without the in-flight guard each one started its own fleet-wide
    // fan-out on top of the probe already running.
    for (const selection of [["1"], [], ["2"], []]) {
      rerender(column({ hosts: hosts, selectedHostIds: new Set(selection) }));
    }

    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
    expect(api.getTmuxOverview).not.toHaveBeenCalled();
  });

  it("still loads the selection that arrived while it was busy", async () => {
    // Coalescing must not mean forgetting: the newest selection is the one on screen, so
    // dropping its fetch would leave the column showing hosts nobody asked for.
    const { rerender } = renderColumn();
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    rerender(column({ hosts: hosts, selectedHostIds: new Set(["2"]) }));

    api.settleAll([]);

    await waitFor(() => expect(api.getTmuxOverview).toHaveBeenCalledWith(2));
    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
  });
});

describe("TmuxSessionsColumn — reacting to the host list", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.reset();
    api.getTmuxOverviewAll.mockClear();
  });

  it("probes once across the host list arriving, not twice", async () => {
    // The shell starts with an empty host list and fills it in a moment later. Both states are
    // real renders, so a column that probes on each one fans out over the whole fleet twice on
    // every single app start — the second run identical to the first, since the server
    // enumerates the hosts itself rather than taking them from this list.
    const { rerender } = render(
      column({ hosts: [], readiness: "pending" as const }),
    );
    await act(async () => {});
    expect(api.getTmuxOverviewAll).not.toHaveBeenCalled();

    rerender(column({ hosts, readiness: "ready" as const }));
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    api.settleCall(0, [session("web-01", "quiet")]);
    await waitFor(() => expect(screen.queryByText("quiet")).not.toBeNull());
    await act(async () => {});

    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
  });

  it("probes once when the host list lands before the identity does", async () => {
    // `getUserInfo` and `loadHosts` are independent requests, so their order is a race. When the
    // hosts win it, probing straight away means probing as nobody: the identity then arrives,
    // the owner guard correctly discards that answer as belonging to a different session, and a
    // second fleet-wide fan-out goes out. The first one's SSH connections were pure waste.
    const { rerender } = render(
      column({ hosts: [], readiness: "pending" as const, userId: null }),
    );
    await act(async () => {});

    rerender(column({ hosts, readiness: "ready" as const, userId: null }));
    await act(async () => {});
    expect(api.getTmuxOverviewAll).not.toHaveBeenCalled();

    rerender(column({ hosts, readiness: "ready" as const, userId: "alice" }));
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    api.settleCall(0, [session("web-01", "quiet")]);
    await waitFor(() => expect(screen.queryByText("quiet")).not.toBeNull());
    await act(async () => {});

    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
  });

  it("cannot be made to probe early by the refresh button", async () => {
    // The gate lived in the effect, so it governed the automatic load and nothing else. Refresh
    // called the loader directly — a click while the column was still waiting probed as nobody,
    // which is the exact fan-out the gate exists to prevent.
    render(column({ hosts: [], readiness: "pending", userId: null }));
    await act(async () => {});

    await userEvent.click(screen.getByLabelText("tmuxMonitor.refresh"));
    await act(async () => {});

    expect(api.getTmuxOverviewAll).not.toHaveBeenCalled();
  });

  it("says so, and offers a way out, when readiness fails", async () => {
    // Waiting forever is a failure state with no name. If the shell cannot say who is asking,
    // the column has to admit it rather than show a skeleton that will never resolve.
    const onRetry = vi.fn();
    render(
      column({ hosts: [], readiness: "unavailable", userId: null, onRetry }),
    );
    await act(async () => {});

    expect(screen.queryByText("tmuxMonitor.notReady")).not.toBeNull();
    await userEvent.click(screen.getByText("tmuxMonitor.retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(api.getTmuxOverviewAll).not.toHaveBeenCalled();
  });

  it("keeps saying it is waiting while the probe is actually running", async () => {
    // The gap the tri-state opened: "pending" is the wait BEFORE the probe, and the probe itself
    // can take many seconds over SSH. With nothing cached, the column had no branch for that at
    // all — no skeleton, no rows, no message. A blank panel for the entire fan-out.
    const { container } = render(
      column({ hosts, readiness: "ready" as const, userId: "alice" }),
    );
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);

    api.settleCall(0, [session("web-01", "quiet")]);
    await waitFor(() => expect(screen.queryByText("quiet")).not.toBeNull());
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
  });

  it("does not go blank if the shell claims ready before it knows the user", async () => {
    // The loader refuses this combination — correctly, it cannot probe as nobody — and a silent
    // refusal with an empty panel is the failure mode that refusal would otherwise create.
    const { container } = render(
      column({ hosts, readiness: "ready" as const, userId: null }),
    );
    await act(async () => {});

    expect(api.getTmuxOverviewAll).not.toHaveBeenCalled();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });

  it("says it is waiting rather than rendering a blank panel", async () => {
    // The gate is a reason to show nothing YET, not a reason to show nothing. If the identity
    // request never answers, a blank column is indistinguishable from an empty one.
    const { container } = render(
      column({ hosts: [], readiness: "pending" as const, userId: null }),
    );
    await act(async () => {});

    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });

  it("reloads when a tmux host appears", async () => {
    const { rerender } = render(column({ hosts: [hosts[0]] }));
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );
    api.settleCall(0, []);

    // Making the loader stable stopped the column depending on the host list at all, so a host
    // added, deleted, or newly tmux-enabled changed nothing until somebody hit refresh.
    rerender(column({ hosts }));

    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(2),
    );
  });

  it("does not reload when the host list churns without changing", async () => {
    const { rerender } = render(column({ hosts: [hosts[0]] }));
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    // Settle AND let the loader finish. A probe still in flight coalesces everything that
    // follows, so churning while it runs proves nothing about what happens when it is idle —
    // which is the state the fleet actually gets stormed from.
    api.settleCall(0, [session("web-01", "quiet")]);
    await waitFor(() => expect(screen.queryByText("quiet")).not.toBeNull());
    await act(async () => {});

    // Every host-list refresh builds a fresh array, and a status flip rewrites the objects in
    // it. Depending on that identity is what made an unrelated edit probe the whole fleet.
    rerender(column({ hosts: [{ ...hosts[0], online: true } as Host] }));
    rerender(column({ hosts: [{ ...hosts[0], online: false } as Host] }));
    rerender(column({ hosts: [{ ...hosts[0] } as Host] }));
    await act(async () => {});

    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
  });

  it("ignores hosts that do not run the monitor", async () => {
    const { rerender } = render(column({ hosts: [hosts[0]] }));
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );
    api.settleCall(0, [session("web-01", "quiet")]);
    await waitFor(() => expect(screen.queryByText("quiet")).not.toBeNull());
    await act(async () => {});

    rerender(
      column({
        hosts: [
          hosts[0],
          { id: "3", name: "no-tmux", enableTmuxMonitor: false } as Host,
        ],
      }),
    );
    await act(async () => {});

    expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1);
  });
});

describe("TmuxSessionsColumn — whose data is on screen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    api.reset();
    api.getTmuxOverviewAll.mockClear();
  });

  it("paints nothing from another account's cache", async () => {
    sessionStorage.setItem(
      "termelix-tmux-fleet-overview:bob",
      JSON.stringify([
        {
          hostId: 9,
          hostName: "bob-secret-host",
          available: true,
          sessions: [
            {
              name: "bob-secret-session",
              created: 0,
              lastActivity: 0,
              attachedClients: 0,
              windows: [],
              tags: [],
            },
          ],
          error: null,
        },
      ]),
    );

    renderColumn();

    // Alice's column, Bob's cache: nothing of his may appear, not even for the moment before
    // her own probe answers.
    expect(screen.queryByText("bob-secret-session")).toBeNull();
    expect(screen.queryByText("bob-secret-host")).toBeNull();
    api.settleAll([]);
  });

  it("discards a probe that was already in flight when the account changed", async () => {
    // The window the account key alone does not close: alice's fleet probe is out over SSH when
    // bob logs in. It resolves into a column that now belongs to him, and the response never
    // passed through the cache — so keying the cache by account does nothing for it.
    const { rerender } = renderColumn();
    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(1),
    );

    rerender(
      column({ hosts: hosts, selectedHostIds: new Set(), userId: "bob" }),
    );

    // Alice's own probe — call 0 — answers, late.
    api.settleCall(0, [
      {
        hostId: 1,
        hostName: "alice-only-host",
        available: true,
        sessions: [
          {
            name: "alice-only-session",
            created: 0,
            lastActivity: 0,
            attachedClients: 0,
            windows: [],
            tags: [],
          },
        ],
        error: null,
      },
    ]);

    await waitFor(() =>
      expect(api.getTmuxOverviewAll).toHaveBeenCalledTimes(2),
    );
    expect(screen.queryByText("alice-only-session")).toBeNull();
    expect(screen.queryByText("alice-only-host")).toBeNull();

    // ...and bob's own probe still lands. Discarding the stale response must not also discard
    // the reload queued behind it, or the new account is left with an empty column and a
    // fleet-wide probe that was thrown away.
    api.settleCall(1, [
      {
        hostId: 2,
        hostName: "db-01",
        available: true,
        sessions: [
          {
            name: "bob-session",
            created: 0,
            lastActivity: 0,
            attachedClients: 0,
            windows: [],
            tags: [],
          },
        ],
        error: null,
      },
    ]);

    await waitFor(() =>
      expect(screen.queryByText("bob-session")).not.toBeNull(),
    );
  });

  it("drops what it is showing when the account changes under it", async () => {
    const { rerender } = renderColumn();
    api.settleAll([
      {
        hostId: 1,
        hostName: "web-01",
        available: true,
        sessions: [
          {
            name: "alice-session",
            created: 0,
            lastActivity: 0,
            attachedClients: 0,
            windows: [],
            tags: [],
          },
        ],
        error: null,
      },
    ]);
    await waitFor(() =>
      expect(screen.queryByText("alice-session")).not.toBeNull(),
    );

    // The shell does not necessarily remount between accounts, so the state initialiser is not
    // a guarantee — the switch itself has to clear what is on screen.
    rerender(
      column({ hosts: hosts, selectedHostIds: new Set(), userId: "bob" }),
    );

    await waitFor(() => expect(screen.queryByText("alice-session")).toBeNull());
  });
});
