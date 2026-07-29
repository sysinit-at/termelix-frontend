import type {
  TmuxHostOverview,
  TmuxSessionOverview,
} from "@/api/tmux-monitor-api";
import { statusRank } from "./tmux-status";

export interface SessionRow {
  hostId: number;
  hostName: string;
  session: TmuxSessionOverview;
}

export interface SessionRows {
  rows: SessionRow[];
  /** Hosts that answered but have no tmux, or could not be reached at all. */
  unavailable: TmuxHostOverview[];
  total: number;
}

/**
 * Flatten host overviews into one status-ranked list.
 *
 * Ranked across hosts rather than grouped by host: a session waiting on input is the thing you
 * came to the column for, and grouping buries the one on host B under everything on host A. Ties
 * break by host then session name so the order is stable between polls.
 */
export function buildSessionRows(
  hosts: TmuxHostOverview[] | null,
  filter = "",
): SessionRows {
  const query = filter.trim().toLowerCase();
  const rows: SessionRow[] = [];
  const unavailable: TmuxHostOverview[] = [];
  let total = 0;

  for (const host of hosts ?? []) {
    if (!host.available) {
      unavailable.push(host);
      continue;
    }
    for (const session of host.sessions ?? []) {
      total += 1;
      const matches =
        query === "" ||
        session.name.toLowerCase().includes(query) ||
        host.hostName.toLowerCase().includes(query);
      if (matches) {
        rows.push({
          hostId: host.hostId,
          hostName: host.hostName,
          session,
        });
      }
    }
  }

  rows.sort(
    (a, b) =>
      statusRank(b.session.status) - statusRank(a.session.status) ||
      a.hostName.localeCompare(b.hostName) ||
      a.session.name.localeCompare(b.session.name),
  );

  return { rows, unavailable, total };
}

/** Whether any pane in the session is an SSH hop onward from the host. */
export function sessionIsRemote(session: TmuxSessionOverview): boolean {
  return (session.windows ?? []).some((w) =>
    (w.panes ?? []).some((p) => p.isRemote),
  );
}

/** Windows and panes in a session, for the count shown on its row. */
export function sessionSize(session: TmuxSessionOverview): {
  windows: number;
  panes: number;
} {
  const windows = session.windows?.length ?? 0;
  const panes = (session.windows ?? []).reduce(
    (n, w) => n + (w.panes?.length ?? 0),
    0,
  );
  return { windows, panes };
}
