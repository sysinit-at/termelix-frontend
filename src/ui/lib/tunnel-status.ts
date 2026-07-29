import type { TunnelStatus } from "@/types";

/**
 * Whether a tunnel status means "up".
 *
 * The wire value's case is not stable: the Elixir server sends `Atom.to_string/1` output, so
 * `"connected"` lowercase, while the SPA's own `TunnelStatusValue` type and the retired Node
 * backend both spell it `"CONNECTED"`. Every display path already copes by upper-casing before
 * comparing (`TunnelInlineControls`, `C2STunnelPresetManager`, `TunnelTab`); the dashboard card
 * compared the raw value against `"CONNECTED"` and therefore counted zero active tunnels forever.
 *
 * Shared rather than inlined so the next caller does not have to rediscover which case it is.
 */
export function isTunnelConnected(
  status?: Pick<TunnelStatus, "status"> | null,
): boolean {
  return status?.status?.toUpperCase() === "CONNECTED";
}

/** How many of a `name -> status` map are up. */
export function countActiveTunnels(
  statuses?: Record<string, Pick<TunnelStatus, "status"> | null> | null,
): number {
  return Object.values(statuses ?? {}).filter(isTunnelConnected).length;
}
