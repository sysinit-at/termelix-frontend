import type { TmuxHostOverview } from "@/api/tmux-monitor-api";

/**
 * The cached fleet overview is keyed by the account that fetched it.
 *
 * `sessionStorage` outlives a logout — `clearTermelixSessionStorage` only removes two
 * localStorage keys — so a first version of this cache, keyed only by name, showed the previous
 * account's host names and session names to the next person who logged in in the same tab,
 * for as long as their own probe took to answer. Host and session names are exactly the kind of
 * thing that must not cross an account boundary.
 *
 * Keyed by user id, so a mismatch cannot be read rather than merely being unlikely to be there;
 * `clearFleetCache` on logout is the second layer, not the only one.
 */
const FLEET_CACHE_PREFIX = "termelix-tmux-fleet-overview:";

function fleetCacheKey(userId: string): string {
  return `${FLEET_CACHE_PREFIX}${userId}`;
}

export function readFleetCache(
  userId: string | null,
): TmuxHostOverview[] | null {
  if (!userId) return null;
  try {
    const raw = sessionStorage.getItem(fleetCacheKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // Anything else is a cache written by a different version of this component.
    return Array.isArray(parsed) ? (parsed as TmuxHostOverview[]) : null;
  } catch {
    return null;
  }
}

export function writeFleetCache(
  userId: string | null,
  hosts: TmuxHostOverview[],
): void {
  if (!userId) return;
  try {
    sessionStorage.setItem(fleetCacheKey(userId), JSON.stringify(hosts));
  } catch {
    // Private mode, or the quota is full. The column works without the cache.
  }
}

/** Drop every account's cached fleet overview. Called on logout. */
export function clearFleetCache(): void {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(FLEET_CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
