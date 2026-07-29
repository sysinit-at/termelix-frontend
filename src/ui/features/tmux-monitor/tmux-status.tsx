import React from "react";
import type { TFunction } from "i18next";
import type { TmuxStatus } from "@/api/tmux-monitor-api";

/** Roll-up / sort priority: waiting agents first, then working, running, idle. */
export const STATUS_RANK: Record<TmuxStatus, number> = {
  waiting: 3,
  working: 2,
  running: 1,
  idle: 0,
};

const STATUS_DOT: Record<TmuxStatus, string> = {
  waiting: "bg-amber-500",
  working: "bg-emerald-500",
  running: "bg-sky-500",
  idle: "bg-muted-foreground/40",
};

export function statusRank(status?: TmuxStatus): number {
  return status ? STATUS_RANK[status] : 0;
}

export function statusLabel(t: TFunction, status?: TmuxStatus): string {
  return t(`tmuxMonitor.status.${status ?? "idle"}`);
}

/** A small activity dot + label. `dotOnly` renders just the colored dot (for dense rows). */
export function TmuxStatusBadge({
  status,
  t,
  dotOnly = false,
}: {
  status?: TmuxStatus;
  t: TFunction;
  dotOnly?: boolean;
}) {
  const s = status ?? "idle";
  const dot = (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT[s]} ${
        s === "waiting" ? "animate-pulse" : ""
      }`}
    />
  );
  if (dotOnly) {
    return (
      <span title={statusLabel(t, s)} aria-label={statusLabel(t, s)}>
        {dot}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {dot}
      {statusLabel(t, s)}
    </span>
  );
}
