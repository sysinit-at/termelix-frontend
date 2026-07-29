import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
  Copy,
  CopyPlus,
  FolderSearch,
  Layers,
  Link,
  Network,
  Pencil,
  Share2,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { copyToClipboard } from "@/lib/clipboard";
import { wakeOnLan } from "@/main-axios";
import type { Host, TabType } from "@/types/ui-types";

export type HostAction =
  | {
      kind: "item";
      id: string;
      label: string;
      icon: LucideIcon;
      onSelect: () => void;
      destructive?: boolean;
    }
  | { kind: "separator"; id: string };

export interface HostActionHandlers {
  onOpenTab: (type: TabType) => void;
  onEditHost?: () => void;
  onShareHost?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  allowDelete: boolean;
}

/** What a host can open, filtered by what it has enabled. */
export function hostOpenActions(
  host: Host,
): { type: TabType; icon: LucideIcon; label: string }[] {
  return [
    host.enableSsh &&
      host.enableTerminal && {
        type: "terminal" as TabType,
        icon: Terminal,
        label: "terminal",
      },
    host.enableSsh &&
      host.enableFileManager && {
        type: "files" as TabType,
        icon: FolderSearch,
        label: "files",
      },
    host.enableSsh &&
      host.enableTunnel && {
        type: "tunnel" as TabType,
        icon: Network,
        label: "tunnel",
      },
    host.enableSsh &&
      host.enableTerminal &&
      host.enableTmuxMonitor && {
        type: "tmux_monitor" as TabType,
        icon: Layers,
        label: "tmuxMonitor",
      },
  ].filter(Boolean) as { type: TabType; icon: LucideIcon; label: string }[];
}

/**
 * Everything you can do to a host, as data rather than as markup.
 *
 * There are two ways to reach these — right-click anywhere on the row, and the button at its
 * right-hand end — and they have to offer the same things. Building both from one list is what
 * makes that true by construction; the version of this code that had the same actions written
 * out in three places had already drifted between them.
 */
export function hostActions(
  host: Host,
  handlers: HostActionHandlers,
  t: TFunction,
): HostAction[] {
  const {
    onOpenTab,
    onEditHost,
    onShareHost,
    onDelete,
    onDuplicate,
    allowDelete,
  } = handlers;

  const copyLink = (view: string, message: string) => {
    void copyToClipboard(
      `${window.location.origin}?view=${view}&hostId=${host.id}`,
    );
    toast.success(message);
  };

  const actions: HostAction[] = [];

  for (const { type, icon, label } of hostOpenActions(host)) {
    actions.push({
      kind: "item",
      id: `open:${type}`,
      label: t(`hosts.open.${label}`),
      icon,
      onSelect: () => onOpenTab(type),
    });
  }

  if (host.macAddress) {
    actions.push({ kind: "separator", id: "sep:wol" });
    actions.push({
      kind: "item",
      id: "wake",
      label: t("hosts.wakeOnLanAction"),
      icon: Zap,
      onSelect: async () => {
        try {
          await wakeOnLan(host.id);
          toast.success(t("hosts.wakeOnLanSuccess", { name: host.name }));
        } catch {
          toast.error(t("hosts.wakeOnLanError"));
        }
      },
    });
  }

  actions.push({ kind: "separator", id: "sep:copy" });
  actions.push({
    kind: "item",
    id: "copy-address",
    label: t("hosts.copyAddress"),
    icon: Copy,
    onSelect: () => {
      void copyToClipboard(`${host.username}@${host.ip}`);
      toast.success(t("hosts.copiedToClipboard"));
    },
  });

  if (host.enableSsh && host.enableTerminal) {
    actions.push({
      kind: "item",
      id: "copy-terminal-url",
      label: t("hosts.copyTerminalUrlAction"),
      icon: Link,
      onSelect: () => copyLink("terminal", t("hosts.terminalUrlCopied")),
    });
  }

  if (host.enableSsh && host.enableFileManager) {
    actions.push({
      kind: "item",
      id: "copy-files-url",
      label: t("hosts.copyFileManagerUrlAction"),
      icon: Link,
      onSelect: () => copyLink("file-manager", t("hosts.fileManagerUrlCopied")),
    });
  }

  if (onEditHost || onShareHost) {
    actions.push({ kind: "separator", id: "sep:manage" });
  }
  if (onEditHost) {
    actions.push({
      kind: "item",
      id: "edit",
      label: t("hosts.editHost"),
      icon: Pencil,
      onSelect: onEditHost,
    });
  }
  if (onShareHost) {
    actions.push({
      kind: "item",
      id: "share",
      label: t("hosts.shareHost"),
      icon: Share2,
      onSelect: onShareHost,
    });
  }

  if (allowDelete) {
    actions.push({ kind: "separator", id: "sep:destructive" });
    actions.push({
      kind: "item",
      id: "duplicate",
      label: t("hosts.cloneHostAction"),
      icon: CopyPlus,
      onSelect: onDuplicate,
    });
    actions.push({
      kind: "item",
      id: "delete",
      label: t("common.delete"),
      icon: Trash2,
      onSelect: onDelete,
      destructive: true,
    });
  }

  return tidySeparators(actions);
}

/**
 * Drop separators that separate nothing.
 *
 * The list is assembled by pushing rules one at a time, and every rule is conditional, so any of
 * them going away leaves its separator behind: a menu that opens with a divider, or ends with
 * one, or shows two in a row. Normalising once at the end is the only version of this that stays
 * correct when the next rule is added.
 */
function tidySeparators(actions: HostAction[]): HostAction[] {
  const tidied: HostAction[] = [];

  for (const action of actions) {
    if (action.kind !== "separator") {
      tidied.push(action);
      continue;
    }
    // Nothing before it, or a separator already there: it separates nothing.
    if (tidied.length === 0) continue;
    if (tidied[tidied.length - 1].kind === "separator") continue;
    tidied.push(action);
  }

  while (tidied.length > 0 && tidied[tidied.length - 1].kind === "separator") {
    tidied.pop();
  }

  return tidied;
}
