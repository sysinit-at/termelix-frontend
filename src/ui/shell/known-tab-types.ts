// Every tab type the app can actually render. Persisted open-tabs may name a type that has
// since been removed (e.g. an upgrade that dropped Host Metrics / Homepage / Network Graph,
// the RDP / VNC / Telnet remote-desktop tabs, or Docker), so restore paths validate against
// this set and drop unknown tabs rather than reopening a blank one.
export const KNOWN_TAB_TYPES: ReadonlySet<string> = new Set([
  "dashboard",
  "terminal",
  "files",
  "host-manager",
  "user-profile",
  "admin-settings",
  "tunnel",
  "tmux_monitor",
  "serial",
]);

export function isKnownTabType(tabType: string): boolean {
  return KNOWN_TAB_TYPES.has(tabType);
}
