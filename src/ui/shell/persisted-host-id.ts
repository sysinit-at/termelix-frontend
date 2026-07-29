import type { Host } from "@/types/ui-types";

/**
 * The `hostId` to persist with an open-tab record, or null when the tab is not bound to a saved
 * host.
 *
 * Not every `Host` in the tab list is a row in the database. The serial console builds one with
 * `id: "serial-<epoch>"` — a display shell around a connection with no saved host behind it.
 * `parseInt` on that returns `NaN`, and `JSON.stringify(NaN)` is `null`, so the record was
 * already being written with a null host — by accident, through a value that means "not a
 * number", not through a decision. Anything that later treated `NaN` as a number would have been
 * silently wrong.
 *
 * (Quick Connect used the same trick with a `quick-connect-<epoch>` id and has since been
 * removed; a serial tab is what is left, and it cannot be restored either — there is no saved
 * host to reconnect to.)
 */
export function persistedHostId(host?: Host | null): number | null {
  if (!host) return null;

  const id = Number(host.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
