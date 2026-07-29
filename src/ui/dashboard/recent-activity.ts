import type { RecentActivityItem } from "@/api/dashboard-api";
import type { TabType } from "@/types/ui-types";

// The tab each activity type opens. Doubles as the set of activity types this build can
// render — anything absent is dropped by `filterKnownActivity`.
export const ACTIVITY_TAB_TYPES: Record<RecentActivityItem["type"], TabType> = {
  terminal: "terminal",
  file_manager: "files",
  server_stats: "terminal",
  tunnel: "tunnel",
};

// Historic activity rows may name an activity type that has since been removed (rdp / vnc /
// telnet / docker). Drop them rather than rendering a label-less, iconless row that opens an
// undefined tab type when clicked.
export function filterKnownActivity(
  activity: RecentActivityItem[],
): RecentActivityItem[] {
  return activity.filter((item) => item.type in ACTIVITY_TAB_TYPES);
}
