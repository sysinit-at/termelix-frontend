import { describe, it, expect, vi } from "vitest";

import { hostActions, hostOpenActions } from "./host-actions";
import type { Host } from "@/types/ui-types";

vi.mock("@/main-axios", () => ({ wakeOnLan: vi.fn() }));
vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const t = ((key: string) => key) as never;

function host(overrides: Partial<Host> = {}): Host {
  return {
    id: "1",
    name: "web-01",
    username: "root",
    ip: "10.0.0.1",
    enableSsh: true,
    enableTerminal: true,
    enableFileManager: true,
    enableTunnel: true,
    enableTmuxMonitor: true,
    ...overrides,
  } as Host;
}

const handlers = {
  onOpenTab: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
  allowDelete: true,
};

const ids = (h: Host, extra = {}) =>
  hostActions(h, { ...handlers, ...extra }, t)
    .filter((a) => a.kind === "item")
    .map((a) => a.id);

describe("hostActions", () => {
  it("offers only what the host has enabled", () => {
    expect(ids(host())).toEqual(
      expect.arrayContaining([
        "open:terminal",
        "open:files",
        "open:tunnel",
        "open:tmux_monitor",
      ]),
    );

    const minimal = ids(
      host({
        enableFileManager: false,
        enableTunnel: false,
        enableTmuxMonitor: false,
      }),
    );
    expect(minimal).toContain("open:terminal");
    expect(minimal).not.toContain("open:files");
    expect(minimal).not.toContain("open:tunnel");
    expect(minimal).not.toContain("open:tmux_monitor");
  });

  it("drops everything SSH when SSH is off", () => {
    expect(hostOpenActions(host({ enableSsh: false }))).toEqual([]);
  });

  it("offers wake-on-LAN only with a MAC address", () => {
    expect(ids(host())).not.toContain("wake");
    expect(ids(host({ macAddress: "aa:bb:cc:dd:ee:ff" }))).toContain("wake");
  });

  it("hides edit and share unless the caller passes them", () => {
    // A shared host arrives without the handlers its permission level does not allow.
    expect(ids(host())).not.toContain("edit");
    expect(ids(host())).not.toContain("share");
    expect(ids(host(), { onEditHost: vi.fn(), onShareHost: vi.fn() })).toEqual(
      expect.arrayContaining(["edit", "share"]),
    );
  });

  it("hides destructive actions without permission", () => {
    const readOnly = ids(host(), { allowDelete: false });
    expect(readOnly).not.toContain("delete");
    expect(readOnly).not.toContain("duplicate");
    expect(ids(host())).toEqual(
      expect.arrayContaining(["delete", "duplicate"]),
    );
  });

  it("marks only deletion destructive", () => {
    const destructive = hostActions(host(), handlers, t)
      .filter((a) => a.kind === "item" && a.destructive)
      .map((a) => (a.kind === "item" ? a.id : ""));
    expect(destructive).toEqual(["delete"]);
  });

  it("never emits a separator with nothing after it", () => {
    // A trailing or doubled separator is the visible symptom of an action list assembled by
    // pushing rules one at a time.
    for (const h of [
      host(),
      host({ enableSsh: false }),
      host({ macAddress: "aa:bb:cc:dd:ee:ff" }),
    ]) {
      for (const allowDelete of [true, false]) {
        const kinds = hostActions(h, { ...handlers, allowDelete }, t).map(
          (a) => a.kind,
        );
        expect(kinds.at(0)).not.toBe("separator");
        expect(kinds.at(-1)).not.toBe("separator");
        expect(kinds.join(",")).not.toContain("separator,separator");
      }
    }
  });
});
