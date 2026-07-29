import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Globe2, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/button.tsx";
import { Input } from "@/components/input.tsx";
import { Skeleton } from "@/components/skeleton.tsx";
import { isElectron } from "@/main-axios";
import {
  getTmuxOverviewAll,
  type TmuxHostOverview,
  type TmuxSessionOverview,
} from "@/api/tmux-monitor-api";
import { statusRank, TmuxStatusBadge } from "./tmux-status";

/**
 * The global tmux view: every tmux session across all the user's tmux-enabled hosts, in one
 * list grouped by host. Self-contained (its own fetch) so it doesn't entangle the per-host
 * monitor's selection/state. Clicking a session opens a terminal tab attached to that
 * host+session, reusing the same URL scheme as the per-host "Attach".
 *
 * Loads once when opened and refreshes only on the explicit Refresh button — deliberately
 * NOT on a timer: each load fans out an SSH probe to every tmux-enabled host, so a tight
 * background poll would open a connection storm across the whole fleet. The per-host monitor
 * (which polls a single selected host) keeps its interval; this aggregate view does not.
 */
export function GlobalTmuxView({ isVisible }: { isVisible: boolean }) {
  const { t } = useTranslation();
  const [hosts, setHosts] = useState<TmuxHostOverview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reentrancy guard: each load fans out an SSH probe to every host, so overlapping loads
  // (rapid Refresh clicks, or a refresh landing on the initial load) would multiply into
  // concurrent fleet-wide storms. A ref — not the async `loading` state — gates it so a
  // second call is dropped synchronously before it can start another fan-out.
  const inFlightRef = useRef(false);
  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const data = await getTmuxOverviewAll();
      setHosts(data);
      setError(null);
    } catch {
      setError("failed");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  // Load once when the view becomes visible; refreshes are manual (see the moduledoc —
  // no timer, because each load probes every host over SSH).
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!isVisible || loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [isVisible, load]);

  const attach = useCallback((hostId: number, sessionName: string) => {
    // Electron blocks window.open of internal routes; the per-host monitor handles that
    // case with an in-place terminal, so the global list attaches in a new tab only in
    // the browser (matching openTerminal's non-electron path).
    if (isElectron()) return;
    const params = new URLSearchParams({
      view: "terminal",
      hostId: String(hostId),
      tmuxSession: sessionName,
    });
    window.open(`${window.location.pathname}?${params.toString()}`, "_blank");
  }, []);

  const [filter, setFilter] = useState("");

  const totalSessions = (hosts ?? []).reduce(
    (n, h) => n + h.sessions.length,
    0,
  );

  // A single FLEET-WIDE tiered list: every session across every host flattened into one
  // ranked list (waiting agents anywhere float to the top, then working, running, idle;
  // ties break by host then session name). This is the "at a glance across the whole fleet"
  // view — grouping by host would bury a waiting agent on host B beneath all of host A.
  // Unreachable hosts are collected separately so their errors aren't lost.
  const { rows, unavailable } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows: { host: TmuxHostOverview; session: TmuxSessionOverview }[] = [];
    const unavailable: TmuxHostOverview[] = [];

    for (const host of hosts ?? []) {
      if (!host.available) {
        unavailable.push(host);
        continue;
      }
      for (const session of host.sessions) {
        if (
          q === "" ||
          session.name.toLowerCase().includes(q) ||
          host.hostName.toLowerCase().includes(q)
        ) {
          rows.push({ host, session });
        }
      }
    }

    rows.sort(
      (a, b) =>
        statusRank(b.session.status) - statusRank(a.session.status) ||
        a.host.hostName.localeCompare(b.host.hostName) ||
        a.session.name.localeCompare(b.session.name),
    );

    return { rows, unavailable };
  }, [hosts, filter]);

  const sessionRemote = (s: TmuxSessionOverview) =>
    (s.windows ?? []).some((w) => (w.panes ?? []).some((p) => p.isRemote));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Globe2 className="size-4 shrink-0" />
        <span className="text-sm font-semibold">
          {t("tmuxMonitor.allHosts")}
        </span>
        {hosts && (
          <span className="text-xs text-muted-foreground">
            {t("tmuxMonitor.sessionCount", { count: totalSessions })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7"
          onClick={() => void load()}
          disabled={loading}
          aria-label={t("tmuxMonitor.refresh")}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {hosts && (
        <div className="border-b border-border px-3 py-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("tmuxMonitor.filterPlaceholder")}
            className="h-7 text-xs"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {loading && !hosts && (
          <div className="space-y-3 px-1 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        )}

        {error && (
          <div className="space-y-2 px-2 py-4">
            <p className="text-sm text-destructive">
              {t("tmuxMonitor.globalLoadFailed")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-1 size-3" />
              {t("tmuxMonitor.retry")}
            </Button>
          </div>
        )}

        {/* Fleet-wide tiered list: one flat, status-ranked list across all hosts. */}
        {hosts &&
          rows.map(({ host, session: s }) => {
            const windows = s.windows?.length ?? 0;
            const panes = (s.windows ?? []).reduce(
              (n, w) => n + (w.panes?.length ?? 0),
              0,
            );
            return (
              <button
                key={`${host.hostId}:${s.name}`}
                type="button"
                onClick={() => attach(host.hostId, s.name)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <TmuxStatusBadge status={s.status} t={t} dotOnly />
                <span className="truncate font-medium">{s.name}</span>
                {sessionRemote(s) && (
                  <span
                    className="shrink-0 rounded bg-sky-500/15 px-1 text-[10px] font-semibold uppercase text-sky-500"
                    title={t("tmuxMonitor.remoteHint")}
                  >
                    ssh
                  </span>
                )}
                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Server className="size-3" />
                  <span className="max-w-[9rem] truncate">{host.hostName}</span>
                  <span className="text-muted-foreground/60">
                    {t("tmuxMonitor.windowPaneCount", { windows, panes })}
                  </span>
                </span>
              </button>
            );
          })}

        {hosts && rows.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {hosts.length === 0
              ? t("tmuxMonitor.noHosts")
              : filter.trim() !== ""
                ? t("tmuxMonitor.noMatches")
                : t("tmuxMonitor.noSessions")}
          </p>
        )}

        {/* Unreachable / tmux-less hosts, kept out of the tiered list but still surfaced. */}
        {unavailable.length > 0 && (
          <div className="mt-3 border-t border-border pt-2">
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              {t("tmuxMonitor.unreachableHosts")}
            </p>
            {unavailable.map((host) => (
              <div
                key={host.hostId}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground/70"
              >
                <Server className="size-3 shrink-0" />
                <span className="truncate">{host.hostName}</span>
                <span className="ml-auto shrink-0 text-muted-foreground/50">
                  {host.error ?? t("tmuxMonitor.tmuxUnavailable")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
