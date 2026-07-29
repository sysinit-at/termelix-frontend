import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LayoutGrid, RefreshCw, Server, X } from "lucide-react";

import { Button } from "@/components/button.tsx";
import { Input } from "@/components/input.tsx";
import { Skeleton } from "@/components/skeleton.tsx";
import {
  getTmuxOverview,
  getTmuxOverviewAll,
  type TmuxHostOverview,
} from "@/api/tmux-monitor-api";
import type { Host } from "@/types/ui-types";
import { TmuxStatusBadge } from "./tmux-status";
import { buildSessionRows, sessionIsRemote, sessionSize } from "./session-rows";
import { readFleetCache, writeFleetCache } from "./fleet-cache";

/**
 * The tmux sessions column: a permanent part of the shell rather than a view you open.
 *
 * Two modes, driven by the host list's selection:
 *
 *   - nothing selected — every session on every tmux-enabled host, one status-ranked list
 *   - one or more hosts selected — only those hosts, fetched individually
 *
 * The distinction is not cosmetic. The all-hosts endpoint fans an SSH probe out to the whole
 * fleet on every call, which is why it loads once and then only on demand; the per-host endpoint
 * probes exactly one machine, so narrowing the selection is both faster and cheaper. Results are
 * cached per host, so going back to a host you already looked at paints immediately and refreshes
 * underneath.
 */
export function TmuxSessionsColumn({
  hosts,
  selectedHostIds,
  onShowAll,
  onAttach,
  width,
  onResizeStart,
  userId,
  readiness,
  onRetry,
}: {
  hosts: Host[];
  selectedHostIds: Set<string>;
  onShowAll: () => void;
  onAttach: (host: Host, sessionName: string) => void;
  width: number;
  onResizeStart: (event: React.MouseEvent) => void;
  /** Whose sessions these are. Scopes the cross-reload cache to one account. */
  userId: string | null;
  /**
   * Whether the shell can yet say what the hosts are and who is asking.
   *
   * Three states rather than a boolean, because "not ready" covers two situations a user needs
   * told apart: still arriving, and not coming. A column that waits forever on a failed identity
   * request is indistinguishable from a slow one.
   */
  readiness: "pending" | "ready" | "unavailable";
  /** Ask the shell to try again after `unavailable`. */
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const hostById = useMemo(() => {
    const map = new Map<number, Host>();
    for (const host of hosts) map.set(Number(host.id), host);
    return map;
  }, [hosts]);

  /**
   * The hosts this column could show, as a value rather than an identity.
   *
   * `hosts` is a fresh array on every host-list refresh, so depending on it re-probed the whole
   * fleet whenever anything touched a host — a status flip, a rename, an unrelated edit. Making
   * the loader stable fixed that and went too far the other way: adding a host, deleting one, or
   * enabling tmux on one then changed nothing until a manual refresh.
   *
   * A key built from the ids and names that actually affect this list is what belongs in the
   * dependency array. Identical content produces an identical string, so a poll that changes
   * nothing costs nothing, while a host appearing or disappearing reloads.
   */
  const tmuxHostsKey = useMemo(
    () =>
      hosts
        .filter((host) => host.enableTmuxMonitor)
        .map((host) => `${host.id}:${host.name}`)
        .sort()
        .join(","),
    [hosts],
  );

  // Per-host results survive a selection change so re-selecting paints from cache first. Held in
  // a ref rather than state: writing it must not itself trigger a render, only the paint does.
  const cacheRef = useRef(new Map<number, TmuxHostOverview>());

  // The all-hosts view also survives a page reload. It is on the startup path now — the column
  // is part of the shell — and the endpoint behind it probes every tmux host over SSH, so a
  // reload would otherwise mean staring at a skeleton while the fleet answers. Session-scoped
  // so it cannot outlive the tab, and always refreshed underneath what it painted.
  const [overviews, setOverviews] = useState<TmuxHostOverview[] | null>(() =>
    readFleetCache(userId),
  );
  // Each fetch stamps itself; a slower earlier one must not overwrite a newer result.
  const requestRef = useRef(0);
  // Dropping an overlapping load is not the same as ignoring its result. The all-hosts endpoint
  // fans an SSH probe out to every tmux host, so two overlapping calls are two fleet-wide bursts
  // of connections whichever one we end up displaying — and toggling a host on and off is enough
  // to trigger them. Held in a ref so a second call is refused synchronously, before it starts.
  const inFlightRef = useRef(false);
  // The selection that still needs loading, if one arrived while a probe was running.
  const desiredRef = useRef<number[] | null>(null);

  /**
   * Whose column this is, readable from inside a promise that started under someone else.
   *
   * Keying the cache by account does nothing for a probe that is already out over SSH when the
   * account changes: that response never passes through the cache, and the request counter only
   * moves when a NEW fetch starts — so alice's fleet answer landed in bob's column and painted
   * her host and session names there. The switch itself now invalidates in flight work: the
   * counter moves, the in-memory cache is dropped, and any pending selection (host ids that
   * belong to the previous account) is forgotten.
   */
  const ownerRef = useRef(userId);
  if (ownerRef.current !== userId) {
    ownerRef.current = userId;
    requestRef.current += 1;
    cacheRef.current = new Map();
    desiredRef.current = null;
  }

  useEffect(() => {
    setOverviews(readFleetCache(userId));
  }, [userId]);

  const selectedIds = useMemo(
    () =>
      [...selectedHostIds]
        .map(Number)
        .filter((id) => Number.isInteger(id) && hostById.has(id)),
    [selectedHostIds, hostById],
  );
  const selectionKey = selectedIds.join(",");

  /** One probe run for one selection. Never called concurrently — see `runLoads`. */
  const fetchFor = useCallback(
    async (ids: number[]) => {
      // The account this fetch belongs to. Compared against `ownerRef` after every await, so a
      // response cannot outlive the session that asked for it.
      const owner = userId;
      const request = ++requestRef.current;
      const stale = () =>
        ownerRef.current !== owner || requestRef.current !== request;
      setLoading(true);
      setFailed(false);

      try {
        if (ids.length === 0) {
          const all = await getTmuxOverviewAll();
          if (stale()) return;
          for (const host of all) cacheRef.current.set(host.hostId, host);
          writeFleetCache(userId, all);
          setOverviews(all);
          return;
        }

        // One probe per selected host, concurrently. `allSettled` so one unreachable host
        // reports itself in the list instead of blanking the column.
        const settled = await Promise.allSettled(
          ids.map(async (id) => {
            const overview = await getTmuxOverview(id);
            return {
              hostId: id,
              hostName: hostById.get(id)?.name ?? String(id),
              available: overview.available,
              sessions: overview.sessions ?? [],
              error: null,
            } satisfies TmuxHostOverview;
          }),
        );
        if (stale()) return;

        const next = settled.map((result, i) =>
          result.status === "fulfilled"
            ? result.value
            : ({
                hostId: ids[i],
                hostName: hostById.get(ids[i])?.name ?? String(ids[i]),
                available: false,
                sessions: [],
                error: t("tmuxMonitor.tmuxUnavailable"),
              } satisfies TmuxHostOverview),
        );
        for (const host of next) cacheRef.current.set(host.hostId, host);
        setOverviews(next);
      } catch {
        if (stale()) return;
        setFailed(true);
      } finally {
        if (!stale()) setLoading(false);
      }
    },
    [hostById, t, userId],
  );

  // Always the current account's fetcher, so a loop that outlives a switch continues as the new
  // account rather than the one it started under.
  const fetchRef = useRef(fetchFor);
  fetchRef.current = fetchFor;
  // Read inside a stable callback, so the guard cannot go stale the way a captured prop would.
  const readyRef = useRef(readiness);
  readyRef.current = readiness;
  const ownerKnownRef = useRef(userId);
  ownerKnownRef.current = userId;

  /**
   * Ask for a selection to be loaded, coalescing bursts into one run at a time.
   *
   * Refusing an overlapping call outright would be wrong — the newest selection is the one the
   * user is looking at, and dropping its fetch leaves the column showing somebody else's hosts.
   * So the latest request is remembered instead, and picked up when the running probe finishes:
   * shift-clicking through five hosts issues one probe now and one for wherever the selection
   * landed, never five fleet-wide bursts of SSH connections at once.
   */
  const load = useCallback((ids: number[]) => {
    // Checked here rather than at the call site: this used to live in the effect, which left
    // Refresh and Retry free to probe as nobody, before the shell knew whose column this is.
    // One loader, one precondition — and it names both halves rather than trusting the shell to
    // have combined them, because a probe made before the identity is known is thrown away by
    // the owner guard and replaced by a second fleet-wide fan-out.
    if (readyRef.current !== "ready" || !ownerKnownRef.current) return;
    desiredRef.current = ids;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        while (desiredRef.current !== null) {
          const next = desiredRef.current;
          desiredRef.current = null;
          await fetchRef.current(next);
        }
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, []);

  // Paint what is already known for this selection before the fetch lands. Without this, every
  // click on a host blanks the column for as long as an SSH probe takes.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    const cached = selectedIds
      .map((id) => cacheRef.current.get(id))
      .filter((entry): entry is TmuxHostOverview => entry !== undefined);
    if (cached.length > 0) setOverviews(cached);
    // Same reasoning as the fetch below: the key is the content of the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  useEffect(() => {
    // `load` refuses anything but "ready"; this is only about not asking in the first place.
    // `selectedIds` is a fresh array on every render, so depending on it would refetch forever;
    // `selectionKey` is its content. Parsed back here rather than closed over, which keeps the
    // dependency list honest instead of silencing the lint rule.
    load(selectionKey === "" ? [] : selectionKey.split(",").map(Number));
    // `userId` and `tmuxHostsKey` are dependencies because `load` is stable now and no longer
    // carries those changes implicitly: a switch has to reload as the new account, and a host
    // appearing or disappearing has to be reflected without waiting for a manual refresh.
  }, [selectionKey, userId, tmuxHostsKey, readiness, load]);

  const { rows, unavailable, total } = useMemo(
    () => buildSessionRows(overviews, filter),
    [overviews, filter],
  );

  const filtering = selectedIds.length > 0;
  const selectedNames = selectedIds
    .map((id) => hostById.get(id)?.name)
    .filter(Boolean) as string[];

  return (
    <div
      className="relative hidden md:flex flex-col min-h-0 shrink-0 border-r border-border bg-sidebar"
      style={{ width }}
    >
      <div className="flex items-center gap-2 h-12.5 px-3 border-b border-border shrink-0">
        <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {t("tmuxMonitor.sessionsColumnTitle")}
        </span>
        {overviews && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {total}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-6 shrink-0"
          onClick={() => load(selectedIds)}
          disabled={loading || readiness !== "ready"}
          title={t("tmuxMonitor.refresh")}
          aria-label={t("tmuxMonitor.refresh")}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* What the list is scoped to, and the way back to everything. */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border shrink-0 min-h-8">
        {filtering ? (
          <>
            <Server className="size-3 shrink-0 text-muted-foreground" />
            <span
              className="text-[11px] truncate text-muted-foreground"
              title={selectedNames.join(", ")}
            >
              {selectedNames.length === 1
                ? selectedNames[0]
                : t("tmuxMonitor.hostsSelected", {
                    count: selectedNames.length,
                  })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-1.5 text-[11px] shrink-0"
              onClick={onShowAll}
            >
              <X className="size-3 mr-1" />
              {t("tmuxMonitor.showAll")}
            </Button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {t("tmuxMonitor.allHosts")}
          </span>
        )}
      </div>

      <div className="px-2 py-1.5 border-b border-border shrink-0">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("tmuxMonitor.filterPlaceholder")}
          className="h-6 text-[11px]"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {readiness === "unavailable" && !overviews && (
          <div className="flex flex-col items-start gap-2 p-3">
            <p className="text-[11px] text-muted-foreground">
              {t("tmuxMonitor.notReady")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px]"
              onClick={onRetry}
            >
              <RefreshCw className="mr-1 size-3" />
              {t("tmuxMonitor.retry")}
            </Button>
          </div>
        )}

        {/*
         * Everything that is "nothing to show, and not an error": held back by the gate,
         * probing, or refused by the loader because the shell's props disagree with each other.
         * Enumerating the reasons is what went wrong before — the condition listed the states
         * somebody thought of, and the probe itself, an SSH round to every tmux host, was not
         * one of them. Saying it the other way round leaves no gap to find: if there is no data,
         * no failure, and no reason given, the honest thing on screen is "waiting".
         */}
        {!overviews && !failed && readiness !== "unavailable" && (
          <div className="flex flex-col gap-1.5 p-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        )}

        {failed && (
          <div className="flex flex-col items-start gap-2 p-3">
            <p className="text-[11px] text-destructive">
              {t("tmuxMonitor.globalLoadFailed")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => load(selectedIds)}
            >
              <RefreshCw className="mr-1 size-3" />
              {t("tmuxMonitor.retry")}
            </Button>
          </div>
        )}

        {rows.map(({ hostId, hostName, session }) => {
          const host = hostById.get(hostId);
          const { windows, panes } = sessionSize(session);
          return (
            <button
              key={`${hostId}:${session.name}`}
              type="button"
              disabled={!host}
              onClick={() => host && onAttach(host, session.name)}
              className="group flex w-full flex-col gap-0.5 border-b border-border/40 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <TmuxStatusBadge status={session.status} t={t} dotOnly />
                <span className="truncate text-[12px] font-medium leading-none">
                  {session.name}
                </span>
                {sessionIsRemote(session) && (
                  <span
                    className="shrink-0 border border-sky-500/30 px-1 text-[9px] font-semibold uppercase leading-none text-sky-500"
                    title={t("tmuxMonitor.remoteHint")}
                  >
                    ssh
                  </span>
                )}
                {session.attachedClients > 0 && (
                  <span
                    className="ml-auto shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground/70"
                    title={t("tmuxMonitor.attachedClients", {
                      count: session.attachedClients,
                    })}
                  >
                    {t("tmuxMonitor.attachedShort")}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1.5 pl-3.5 text-[10px] text-muted-foreground/70">
                {/* The host is what tells two identically-named sessions apart. */}
                <span className="truncate">{hostName}</span>
                <span className="ml-auto shrink-0 tabular-nums">
                  {t("tmuxMonitor.windowPaneCount", { windows, panes })}
                </span>
              </span>
            </button>
          );
        })}

        {overviews && rows.length === 0 && !loading && (
          <p className="px-3 py-4 text-[11px] text-muted-foreground">
            {hosts.length === 0
              ? t("tmuxMonitor.noHosts")
              : filter.trim() !== ""
                ? t("tmuxMonitor.noMatches")
                : t("tmuxMonitor.noSessions")}
          </p>
        )}

        {unavailable.length > 0 && (
          <div className="border-t border-border mt-1 pt-1">
            <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {t("tmuxMonitor.unreachableHosts")}
            </p>
            {unavailable.map((host) => (
              <div
                key={host.hostId}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground/60"
                title={host.error ?? t("tmuxMonitor.tmuxUnavailable")}
              >
                <Server className="size-2.5 shrink-0" />
                <span className="truncate">{host.hostName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-30 transition-colors hover:bg-accent-brand/40"
      />
    </div>
  );
}

export default TmuxSessionsColumn;
