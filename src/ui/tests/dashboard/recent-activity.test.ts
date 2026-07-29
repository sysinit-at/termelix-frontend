import { describe, it, expect } from "vitest";

import type { RecentActivityItem } from "@/api/dashboard-api";
import {
  ACTIVITY_TAB_TYPES,
  filterKnownActivity,
} from "@/dashboard/recent-activity";

function item(
  id: number,
  type: string,
): RecentActivityItem & { type: RecentActivityItem["type"] } {
  return {
    id,
    userId: "u1",
    // Legacy rows carry types the current union no longer names.
    type: type as RecentActivityItem["type"],
    hostId: 1,
    hostName: "web-1",
    timestamp: "2026-01-01T00:00:00Z",
  };
}

describe("filterKnownActivity", () => {
  it("keeps activity types this build can open", () => {
    const activity = [item(1, "terminal"), item(2, "tunnel")];
    expect(filterKnownActivity(activity)).toHaveLength(2);
  });

  it("drops retired remote-desktop and docker activity", () => {
    const activity = [
      item(1, "terminal"),
      item(2, "rdp"),
      item(3, "vnc"),
      item(4, "telnet"),
      item(5, "docker"),
    ];

    expect(filterKnownActivity(activity).map((a) => a.id)).toEqual([1]);
  });

  it("returns nothing when every row is a retired type (empty state)", () => {
    expect(filterKnownActivity([item(1, "rdp")])).toEqual([]);
  });

  it("has no tab mapping for a retired type", () => {
    expect("rdp" in ACTIVITY_TAB_TYPES).toBe(false);
  });
});
