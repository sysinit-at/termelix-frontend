import { describe, it, expect, beforeEach } from "vitest";

import {
  clearFleetCache,
  readFleetCache,
  writeFleetCache,
} from "./fleet-cache";
import type { TmuxHostOverview } from "@/api/tmux-monitor-api";

const alice: TmuxHostOverview[] = [
  {
    hostId: 1,
    hostName: "alice-prod-db",
    available: true,
    sessions: [
      {
        name: "customer-migration",
        created: 0,
        lastActivity: 0,
        attachedClients: 0,
        windows: [],
        tags: [],
      },
    ],
    error: null,
  },
];

describe("fleet overview cache", () => {
  beforeEach(() => sessionStorage.clear());

  it("gives an account back its own data", () => {
    writeFleetCache("alice", alice);
    expect(readFleetCache("alice")).toEqual(alice);
  });

  it("does not hand one account's hosts to another", () => {
    // The leak this exists to prevent: `sessionStorage` outlives a logout, and
    // `clearTermelixSessionStorage` only removes two localStorage keys. Logging out and back in
    // as somebody else in the same tab showed the previous account's host and session names —
    // "alice-prod-db", "customer-migration" — until their own probe answered.
    writeFleetCache("alice", alice);
    expect(readFleetCache("bob")).toBeNull();
  });

  it("holds nothing without an account to hold it for", () => {
    writeFleetCache(null, alice);
    expect(sessionStorage.length).toBe(0);
    expect(readFleetCache(null)).toBeNull();
  });

  it("is emptied for every account on logout", () => {
    writeFleetCache("alice", alice);
    writeFleetCache("bob", alice);
    sessionStorage.setItem("unrelated-key", "keep me");

    clearFleetCache();

    expect(readFleetCache("alice")).toBeNull();
    expect(readFleetCache("bob")).toBeNull();
    // Scoped to its own prefix — it is not a general storage wipe.
    expect(sessionStorage.getItem("unrelated-key")).toBe("keep me");
  });

  it("ignores a cache it cannot recognise", () => {
    sessionStorage.setItem("termelix-tmux-fleet-overview:alice", "not json");
    expect(readFleetCache("alice")).toBeNull();

    sessionStorage.setItem(
      "termelix-tmux-fleet-overview:alice",
      JSON.stringify({ hosts: [] }),
    );
    expect(readFleetCache("alice")).toBeNull();
  });
});
