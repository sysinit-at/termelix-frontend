/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  FolderOpen,
  FolderSearch,
  Loader2,
  MemoryStick,
  Network,
  Pencil,
  Pin,
  Server,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/dropdown-menu";
import { toast } from "sonner";
import {
  bulkUpdateSSHHosts,
  createSSHHost,
  deleteSSHHost,
  renameFolder,
  updateFolderMetadata,
  deleteAllHostsInFolder,
} from "@/main-axios";
import type { Host, HostFolder, TabType } from "@/types/ui-types";
import type { SSHHostData } from "@/types/index";
import { FolderIconEl } from "@/components/folder-style";
import { ContextMenu, ContextMenuTrigger } from "@/components/context-menu";
import { HostActionsButton, HostActionsMenu } from "./HostActionsMenu";
import {
  canDeleteHost,
  canEditHost,
  canShareHost,
} from "@/sidebar/host-permissions";
import { FolderMetadataDialog } from "./FolderMetadataDialog";
import {
  useStatusColorScheme,
  getStatusClasses,
} from "@/hooks/use-status-color-scheme";
import {
  useHostStatus,
  useServerStatus,
  useServerStatusMeta,
} from "@/lib/ServerStatusContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/tooltip";

export function isFolder(item: Host | HostFolder): item is HostFolder {
  return "children" in item;
}

function statusCheckEnabled(host: Host): boolean {
  return host.statsConfig?.statusCheckEnabled !== false;
}

function buildStatusTooltip(host: Host, online: boolean): string {
  const statusLabel = online ? "Online" : "Offline";
  if (!statusCheckEnabled(host)) return "Monitoring disabled";
  const protocols: string[] = [];
  if (host.enableSsh) protocols.push("SSH");
  if (protocols.length === 0) return statusLabel;
  return `${protocols.join(", ")}: ${statusLabel}`;
}

function hostMatchesQuery(host: Host, query: string) {
  return (
    host.name.toLowerCase().includes(query) ||
    host.ip.toLowerCase().includes(query) ||
    host.username.toLowerCase().includes(query) ||
    host.tags?.some((t) => t.toLowerCase().includes(query))
  );
}

function folderHasMatch(folder: HostFolder, query: string): boolean {
  for (const child of folder.children) {
    if (isFolder(child)) {
      if (folderHasMatch(child, query)) return true;
    } else {
      if (hostMatchesQuery(child, query)) return true;
    }
  }
  return false;
}

type VirtualRow = { item: Host | HostFolder; depth: number };

function collectVisibleRows(
  children: (Host | HostFolder)[],
  query: string,
  openSet: Set<string>,
  out: VirtualRow[] = [],
  depth = 0,
): VirtualRow[] {
  for (const child of children) {
    if (isFolder(child)) {
      const visible = query ? folderHasMatch(child, query) : true;
      if (!visible) continue;
      out.push({ item: child, depth });
      const childOpen = query ? true : openSet.has(child.path ?? child.name);
      if (childOpen)
        collectVisibleRows(child.children, query, openSet, out, depth + 1);
    } else {
      if (!query || hostMatchesQuery(child, query))
        out.push({ item: child, depth });
    }
  }
  return out;
}

function collectAllHosts(children: (Host | HostFolder)[]): Host[] {
  const out: Host[] = [];
  for (const child of children) {
    if (isFolder(child)) {
      out.push(...collectAllHosts(child.children));
    } else {
      out.push(child);
    }
  }
  return out;
}

// Open/close state and folder assignment are both keyed by the full " / " path,
// so two folders that share a leaf name don't collapse together. Synthetic group
// headers (group-by views) are excluded from the assignable-folder list.
function collectAllFolderPaths(children: (Host | HostFolder)[]): string[] {
  const paths = new Set<string>();
  for (const child of children) {
    if (isFolder(child)) {
      const path = child.path ?? child.name;
      if (!path.startsWith("__group__:")) paths.add(path);
      for (const p of collectAllFolderPaths(child.children)) paths.add(p);
    }
  }
  return Array.from(paths).sort((a, b) => a.localeCompare(b));
}

function folderHostCount(folder: HostFolder): {
  total: number;
  online: number;
} {
  let total = 0,
    online = 0;
  for (const child of folder.children) {
    if (isFolder(child)) {
      const c = folderHostCount(child);
      total += c.total;
      online += c.online;
    } else {
      total++;
      if (child.online) online++;
    }
  }
  return { total, online };
}

/**
 * One host, one row.
 *
 * What a click does changed with the sessions column: selecting a host scopes that column to it,
 * which is the thing you do most often. Opening something is a deliberate act — double-click for a
 * terminal, right-click for everything else.
 *
 * This replaces three drifted copies of the same action set (a tray that slid open on hover, a tray
 * that opened on tap, and a third inside the compact row). The list no longer reflows as the
 * pointer crosses it, and there is one place to change an action.
 */
export function HostItem({
  host,
  onOpenTab,
  onEditHost: onEditHostProp,
  onShareHost: onShareHostProp,
  onDelete,
  onDuplicate,
  query = "",
  selectionMode = false,
  selected = false,
  onToggleSelect,
  focused = false,
  onSelect,
  onDragStart,
  onDragEnd,
  depth = 0,
}: {
  host: Host;
  onOpenTab: (type: TabType) => void;
  onEditHost?: () => void;
  onShareHost?: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  query?: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** This host scopes the sessions column right now. */
  focused?: boolean;
  /** Plain click; the event carries shift/meta so the caller can extend the selection. */
  onSelect?: (event: React.MouseEvent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Nesting level when rendered in a flattened virtual list. */
  depth?: number;
}) {
  const { t } = useTranslation();
  // Shared hosts expose actions matching the recipient's permission level.
  const onEditHost = canEditHost(host) ? onEditHostProp : undefined;
  const onShareHost = canShareHost(host) ? onShareHostProp : undefined;
  const allowDelete = canDeleteHost(host);
  const [showHostTags, setShowHostTags] = useState<boolean>(() => {
    const v = localStorage.getItem("showHostTags");
    return v !== null ? v === "true" : true;
  });
  const [compactHostView, setCompactHostView] = useState(
    () => localStorage.getItem("compactHostView") === "true",
  );
  const statusScheme = useStatusColorScheme();
  const { initialLoadComplete } = useServerStatusMeta();
  const statusCheckOn = statusCheckEnabled(host);
  const statusLoading = !initialLoadComplete && statusCheckOn;
  // Per-host subscription — status polls only re-render rows that flipped.
  const liveStatus = useHostStatus(Number(host.id), statusCheckOn);
  const isOnline = liveStatus != null ? liveStatus === "online" : host.online;
  const isTouchOnly =
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  useEffect(() => {
    const handler = () => {
      const v = localStorage.getItem("showHostTags");
      setShowHostTags(v !== null ? v === "true" : true);
    };
    window.addEventListener("storage", handler);
    window.addEventListener("showHostTagsChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("showHostTagsChanged", handler);
    };
  }, []);

  useEffect(() => {
    const handler = () =>
      setCompactHostView(localStorage.getItem("compactHostView") === "true");
    window.addEventListener("storage", handler);
    window.addEventListener("compactHostViewChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("compactHostViewChanged", handler);
    };
  }, []);

  if (query && !hostMatchesQuery(host, query)) return null;

  const depthStyle =
    depth > 0 ? ({ paddingLeft: depth * 12 } as const) : undefined;

  const hasMetrics =
    isOnline &&
    ((host.cpu != null && host.cpu > 0) || (host.ram != null && host.ram > 0));

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable={!selectionMode && !isTouchOnly}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart?.();
          }}
          onDragEnd={() => onDragEnd?.()}
          style={depthStyle}
          data-selected={focused || undefined}
          // One background at a time. Zebra striping used to run underneath both the hover and
          // the selection tint, so three treatments competed on the same row and none of them
          // read as the answer to "which host am I on".
          className={`group relative flex items-stretch cursor-pointer select-none transition-colors ${
            focused
              ? "bg-accent-brand/10"
              : selected
                ? "bg-accent-brand/5"
                : "hover:bg-muted/40"
          }`}
          onClick={(e) => {
            if (selectionMode) {
              onToggleSelect?.();
              return;
            }
            onSelect?.(e);
          }}
          onDoubleClick={() => {
            if (selectionMode) return;
            // The one action worth a shortcut. Everything else is on the context menu.
            if (host.enableSsh && host.enableTerminal) onOpenTab("terminal");
          }}
        >
          {/* The left edge means one thing: this host scopes the sessions column. Status is the
              dot next to the name — painting every online host's edge as well left two signals
              competing in the same three pixels, and the one you were looking for lost. */}
          <div
            className={`w-[3px] shrink-0 transition-colors ${
              focused ? "bg-accent-brand" : "bg-transparent"
            }`}
          />

          <div
            className={`flex flex-col flex-1 min-w-0 px-2.5 ${compactHostView ? "py-1" : "py-1.5"} gap-0.5`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {selectionMode && (
                <div
                  className={`size-3.5 border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? "border-accent-brand bg-accent-brand" : "border-border bg-background"}`}
                >
                  {selected && <Check className="size-2 text-background" />}
                </div>
              )}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger className="flex items-center">
                    <span
                      className={`size-1.5 rounded-full shrink-0 ${getStatusClasses(isOnline, statusScheme, "dot", statusLoading)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {buildStatusTooltip(host, isOnline)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[13px] font-medium truncate text-foreground leading-none">
                {host.name}
              </span>
              {host.pin && (
                <Pin className="size-2.5 text-accent-brand/50 shrink-0" />
              )}
              {host.isShared && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 text-[9px] px-1 py-px border border-accent-brand/30 bg-accent-brand/10 text-accent-brand shrink-0 leading-none uppercase tracking-wider">
                        <Users className="size-2.5" />
                        {t("hosts.sharing.sharedBadge")}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t("hosts.sharing.sharedBadgeTooltip", {
                        owner: host.ownerUsername || "?",
                        level: t(
                          `hosts.sharing.levels.${host.permissionLevel ?? "connect"}.label`,
                        ),
                      })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Metrics sit on the name row and stay put — they used to appear only while the
                  pointer was over the row, which is when they are hardest to read. The actions
                  button follows them, so the row's right edge is where you look for both. */}
              {!compactHostView && hasMetrics && (
                <span className="ml-auto flex items-center gap-2 shrink-0">
                  {host.cpu != null && host.cpu > 0 && (
                    <span
                      className="flex items-center gap-1"
                      title={t("hosts.cpuUsage", { value: host.cpu })}
                    >
                      <Cpu className="size-2.5 shrink-0 text-muted-foreground/40" />
                      <span className="text-[9px] tabular-nums text-muted-foreground/50">
                        {host.cpu}%
                      </span>
                    </span>
                  )}
                  {host.ram != null && host.ram > 0 && (
                    <span
                      className="flex items-center gap-1"
                      title={t("hosts.ramUsage", { value: host.ram })}
                    >
                      <MemoryStick className="size-2.5 shrink-0 text-muted-foreground/40" />
                      <span className="text-[9px] tabular-nums text-muted-foreground/50">
                        {host.ram}%
                      </span>
                    </span>
                  )}
                </span>
              )}

              {!selectionMode && (
                <span
                  className={hasMetrics && !compactHostView ? "" : "ml-auto"}
                >
                  <HostActionsButton
                    host={host}
                    onOpenTab={onOpenTab}
                    onEditHost={onEditHost}
                    onShareHost={onShareHost}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    allowDelete={allowDelete}
                  />
                </span>
              )}
            </div>

            {!compactHostView && (
              <span className="text-[11px] text-muted-foreground/45 truncate leading-none pl-3">
                {host.username}@{host.ip}
              </span>
            )}

            {!compactHostView &&
              showHostTags &&
              host.tags &&
              host.tags.length > 0 && (
                <div className="flex items-center gap-1 min-w-0 overflow-hidden pl-3">
                  {host.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1 py-px border border-border/50 bg-muted/30 text-muted-foreground/60 lowercase shrink-0 leading-none"
                    >
                      {tag}
                    </span>
                  ))}
                  {host.tags.length > 4 && (
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">
                      +{host.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
          </div>
        </div>
      </ContextMenuTrigger>

      <HostActionsMenu
        host={host}
        onOpenTab={onOpenTab}
        onEditHost={onEditHost}
        onShareHost={onShareHost}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        allowDelete={allowDelete}
      />
    </ContextMenu>
  );
}

export function FolderItem({
  folder,
  depth = 0,
  onOpenTab,
  onEditHost,
  onShareHost,
  onDeleteHost,
  onDuplicateHost,
  query = "",
  openFolders,
  onToggleFolder,
  selectionMode,
  selectedHostIds,
  onToggleSelect,
  focusedHostIds,
  onSelectHost,
  onManageFolder,
  onDeleteFolder,
  onOpenAllSessions,
  onMoveHostsToFolder,
  draggedHostIds,
  onDragHostStart,
  onDragEnd,
  /** When true, only render the folder header (children come from the virtual list). */
  flat = false,
}: {
  folder: HostFolder;
  depth?: number;
  onOpenTab: (host: Host, type: TabType) => void;
  onEditHost?: (host: Host) => void;
  onShareHost?: (host: Host) => void;
  onDeleteHost: (host: Host) => void;
  onDuplicateHost: (host: Host) => void;
  query?: string;
  openFolders: Set<string>;
  onToggleFolder: (name: string) => void;
  selectionMode: boolean;
  selectedHostIds: Set<string>;
  onToggleSelect: (id: string) => void;
  focusedHostIds?: Set<string>;
  onSelectHost?: (host: Host, event: React.MouseEvent) => void;
  onManageFolder: (folder: HostFolder) => void;
  onDeleteFolder: (folder: HostFolder) => void;
  onOpenAllSessions: (folder: HostFolder) => void;
  onMoveHostsToFolder: (hostIds: string[], targetPath: string) => void;
  draggedHostIds: string[] | null;
  onDragHostStart: (hostId: string) => void;
  onDragEnd: () => void;
  flat?: boolean;
}) {
  const { t } = useTranslation();
  const { getStatus, initialLoadComplete } = useServerStatus();
  const { total } = folderHostCount(folder);
  const online = initialLoadComplete
    ? collectAllHosts(folder.children).filter(
        (h) => statusCheckEnabled(h) && getStatus(Number(h.id)) === "online",
      ).length
    : folderHostCount(folder).online;
  const [dragOver, setDragOver] = useState(false);

  if (query && !folderHasMatch(folder, query)) return null;

  const folderPath = folder.path ?? folder.name;
  const isOpen = query ? true : openFolders.has(folderPath);
  // Synthetic group headers (group-by tag/status/etc.) are not real folders, so
  // they can't be edited, deleted, or used as drop targets.
  const isGroup = folderPath.startsWith("__group__:");

  return (
    <div
      style={depth > 0 ? { paddingLeft: depth * 12 } : undefined}
      onDragOver={(e) => {
        if (draggedHostIds && !isGroup) {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (draggedHostIds && !isGroup) {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          onMoveHostsToFolder(draggedHostIds, folderPath);
        }
      }}
    >
      <button
        onClick={() => !query && onToggleFolder(folderPath)}
        className={`group/folder flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 transition-colors text-left cursor-pointer ${dragOver ? "ring-1 ring-inset ring-accent-brand bg-accent-brand/10" : ""}`}
      >
        <ChevronRight
          className={`size-3 shrink-0 text-muted-foreground/50 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        <FolderIconEl
          icon={folder.icon ?? "folder"}
          className={`size-3.5 shrink-0 ${folder.color ? "" : isOpen ? "text-accent-brand" : "text-muted-foreground/60"}`}
          style={folder.color ? { color: folder.color } : undefined}
        />
        {
          <>
            <span className="text-[13px] font-semibold text-foreground/80 truncate flex-1">
              {folder.name}
            </span>
            <span className="text-[10px] tabular-nums shrink-0 ml-1">
              {online > 0 && (
                <span className="text-accent-brand font-semibold">
                  {online}
                </span>
              )}
              <span className="text-muted-foreground/40">/{total}</span>
            </span>
            {!isGroup && (
              <span className="flex items-center gap-1.5 ml-1 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                <span
                  title={t("hosts.openAllSessions")}
                  className="text-muted-foreground/50 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAllSessions(folder);
                  }}
                >
                  <FolderOpen className="size-2.5" />
                </span>
                <span
                  title={t("hosts.editFolder")}
                  className="text-muted-foreground/50 hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageFolder(folder);
                  }}
                >
                  <Pencil className="size-2.5" />
                </span>
                <span
                  title={t("hosts.deleteFolder")}
                  className="text-muted-foreground/50 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                  }}
                >
                  <Trash2 className="size-2.5" />
                </span>
              </span>
            )}
          </>
        }
      </button>
      {!flat && isOpen && (
        <div className="border-l border-border/40 ml-[30px]">
          {folder.children.map((child, i) =>
            isFolder(child) ? (
              <FolderItem
                key={i}
                folder={child}
                depth={depth + 1}
                onOpenTab={onOpenTab}
                onEditHost={onEditHost}
                onShareHost={onShareHost}
                onDeleteHost={onDeleteHost}
                onDuplicateHost={onDuplicateHost}
                query={query}
                openFolders={openFolders}
                onToggleFolder={onToggleFolder}
                selectionMode={selectionMode}
                selectedHostIds={selectedHostIds}
                onToggleSelect={onToggleSelect}
                focusedHostIds={focusedHostIds}
                onSelectHost={onSelectHost}
                onManageFolder={onManageFolder}
                onDeleteFolder={onDeleteFolder}
                onOpenAllSessions={onOpenAllSessions}
                onMoveHostsToFolder={onMoveHostsToFolder}
                draggedHostIds={draggedHostIds}
                onDragHostStart={onDragHostStart}
                onDragEnd={onDragEnd}
              />
            ) : (
              <HostItem
                key={i}
                host={child}
                onOpenTab={(t) => onOpenTab(child, t)}
                onEditHost={onEditHost ? () => onEditHost(child) : undefined}
                onShareHost={onShareHost ? () => onShareHost(child) : undefined}
                onDelete={() => onDeleteHost(child)}
                onDuplicate={() => onDuplicateHost(child)}
                query={query}
                selectionMode={selectionMode}
                selected={selectedHostIds.has(child.id)}
                onToggleSelect={() => onToggleSelect(child.id)}
                focused={focusedHostIds?.has(child.id) ?? false}
                onSelect={(e) => onSelectHost?.(child, e)}
                onDragStart={() => onDragHostStart(child.id)}
                onDragEnd={onDragEnd}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function SidebarTree({
  children,
  onOpenTab,
  onEditHost,
  onShareHost,
  query = "",
  selectionMode,
  onToggleSelectionMode,
  loading = false,
  focusedHostIds,
  onSelectHost,
}: {
  children: (Host | HostFolder)[];
  onOpenTab: (host: Host, type: TabType) => void;
  onEditHost: (host: Host) => void;
  onShareHost?: (host: Host) => void;
  query?: string;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  loading?: boolean;
  /** Hosts the sessions column is currently scoped to. */
  focusedHostIds?: Set<string>;
  /** Plain click on a host row; the event carries shift for range/extend selection. */
  onSelectHost?: (host: Host, event: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("hostOpenFolders");
      return saved ? new Set<string>(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [selectedHostIds, setSelectedHostIds] = useState<Set<string>>(
    new Set(),
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [draggedHostIds, setDraggedHostIds] = useState<string[] | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);
  const [folderDialog, setFolderDialog] = useState<{
    mode: "create" | "edit";
    folder?: HostFolder;
  } | null>(null);
  const [compactHostView, setCompactHostView] = useState(
    () => localStorage.getItem("compactHostView") === "true",
  );
  const [trayOnClick, setTrayOnClick] = useState(
    () => localStorage.getItem("hostTrayOnClick") === "true",
  );

  useEffect(() => {
    const handler = () =>
      setCompactHostView(localStorage.getItem("compactHostView") === "true");
    window.addEventListener("storage", handler);
    window.addEventListener("compactHostViewChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("compactHostViewChanged", handler);
    };
  }, []);

  useEffect(() => {
    const handler = () =>
      setTrayOnClick(localStorage.getItem("hostTrayOnClick") === "true");
    window.addEventListener("storage", handler);
    window.addEventListener("hostTrayOnClickChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("hostTrayOnClickChanged", handler);
    };
  }, []);

  function handleDragHostStart(hostId: string) {
    // When the dragged host is part of an active selection, move the whole set.
    if (selectionMode && selectedHostIds.has(hostId)) {
      setDraggedHostIds([...selectedHostIds]);
    } else {
      setDraggedHostIds([hostId]);
    }
  }

  async function handleMoveHostsToFolder(
    hostIds: string[],
    targetPath: string,
  ) {
    setDraggedHostIds(null);
    try {
      await bulkUpdateSSHHosts(hostIds.map(Number), { folder: targetPath });
      window.dispatchEvent(new CustomEvent("termelix:hosts-changed"));
      toast.success(
        t("hosts.movedToFolder", {
          count: hostIds.length,
          folder: targetPath || t("hosts.folderPickerNone"),
        }),
      );
    } catch {
      toast.error(t("hosts.failedToMoveHosts"));
    }
  }

  function handleManageFolder(folder: HostFolder) {
    setFolderDialog({ mode: "edit", folder });
  }

  function handleOpenAllSessions(folder: HostFolder) {
    const hosts = collectAllHosts(folder.children);
    for (const host of hosts) {
      onOpenTab(host, "terminal");
    }
  }

  async function handleSaveFolderMetadata(value: {
    name: string;
    color: string;
    icon: string;
  }) {
    const existing = folderDialog?.folder;
    try {
      if (existing) {
        const oldPath = existing.path ?? existing.name;
        const parent = oldPath.includes(" / ")
          ? oldPath.slice(0, oldPath.lastIndexOf(" / "))
          : "";
        const newPath = parent ? `${parent} / ${value.name}` : value.name;
        if (newPath !== oldPath) {
          await renameFolder(oldPath, newPath);
        }
        await updateFolderMetadata(newPath, value.color, value.icon);
      } else {
        await updateFolderMetadata(value.name, value.color, value.icon);
      }
      window.dispatchEvent(new CustomEvent("termelix:hosts-changed"));
      toast.success(t("hosts.folderSaved"));
    } catch {
      toast.error(t("hosts.failedToSaveFolder"));
    }
  }

  function handleDeleteFolder(folder: HostFolder) {
    const folderPath = folder.path ?? folder.name;
    const { total } = folderHostCount(folder);
    setConfirmDialog({
      message: t("hosts.deleteFolderConfirm", {
        name: folder.name,
        count: total,
      }),
      onConfirm: async () => {
        try {
          await deleteAllHostsInFolder(folderPath);
          window.dispatchEvent(new CustomEvent("termelix:hosts-changed"));
          toast.success(t("hosts.folderDeleted", { name: folder.name }));
        } catch {
          toast.error(t("hosts.failedToDeleteFolder"));
        }
      },
    });
  }

  useEffect(() => {
    const openCreate = () => setFolderDialog({ mode: "create" });
    const expandAll = () => {
      const next = new Set(collectAllFolderPaths(children));
      persistOpenFolders(next);
      setOpenFolders(next);
    };
    const collapseAll = () => {
      const next = new Set<string>();
      persistOpenFolders(next);
      setOpenFolders(next);
    };
    window.addEventListener("hosts:create-folder", openCreate);
    window.addEventListener("hosts:expand-all", expandAll);
    window.addEventListener("hosts:collapse-all", collapseAll);
    return () => {
      window.removeEventListener("hosts:create-folder", openCreate);
      window.removeEventListener("hosts:expand-all", expandAll);
      window.removeEventListener("hosts:collapse-all", collapseAll);
    };
  }, [children]);

  function persistOpenFolders(next: Set<string>) {
    try {
      localStorage.setItem("hostOpenFolders", JSON.stringify([...next]));
    } catch {
      // ignore quota/serialization failures
    }
  }

  function toggleFolder(name: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      persistOpenFolders(next);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedHostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleDeleteHost(host: Host) {
    setConfirmDialog({
      message: t("hosts.deleteHostConfirm", { name: host.name }),
      onConfirm: async () => {
        try {
          await deleteSSHHost(Number(host.id));
          window.dispatchEvent(new CustomEvent("termelix:hosts-changed"));
          toast.success(t("hosts.deletedCount", { count: 1 }));
        } catch {
          toast.error(t("hosts.failedToDeleteCount", { count: 1 }));
        }
      },
    });
  }

  async function handleDuplicateHost(host: Host) {
    try {
      const duplicateHost: SSHHostData = {
        name: `${host.name} (copy)`,
        ip: host.ip,
        port: host.port,
        username: host.username,
        folder: host.folder,
        tags: host.tags ?? [],
        pin: host.pin ?? false,
        notes: host.notes,
        macAddress: host.macAddress,
        // Key material is never sent to the frontend, so a cloned key-auth
        // host would have authType "key" with no key — unusable. Reset to
        // password so the clone is in a connectable (editable) state.
        authType: host.authType === "key" ? "password" : host.authType,
        password: host.authType === "key" ? null : (host.password ?? null),
        key: null,
        keyPassword: null,
        keyType: null,
        credentialId: host.credentialId ? Number(host.credentialId) : null,
        overrideCredentialUsername: host.overrideCredentialUsername ?? false,
        enableSsh: host.enableSsh,
        enableTerminal: host.enableTerminal,
        enableTunnel: host.enableTunnel,
        enableFileManager: host.enableFileManager,
        sshPort: host.sshPort,
        defaultPath: host.defaultPath ?? "/",
        forceKeyboardInteractive: host.forceKeyboardInteractive ?? false,
        useSocks5: host.useSocks5,
        socks5Host: host.socks5Host ?? null,
        socks5Port: host.socks5Port ?? null,
        socks5Username: host.socks5Username ?? null,
        socks5Password: host.socks5Password ?? null,
        socks5ProxyChain: host.socks5ProxyChain ?? null,
        jumpHosts: (host.jumpHosts ?? []).map((j) => ({
          hostId: Number(j.hostId),
        })),
        portKnockSequence: host.portKnockSequence ?? [],
        tunnelConnections: host.serverTunnels ?? [],
        quickActions: (host.quickActions ?? []).map((a) => ({
          name: a.name,
          snippetId: Number(a.snippetId),
        })),
        statsConfig: host.statsConfig,
        terminalConfig: host.terminalConfig ?? null,
      };
      await createSSHHost(duplicateHost);
      window.dispatchEvent(new CustomEvent("termelix:hosts-changed"));
      toast.success(t("hosts.duplicatedHost", { name: host.name }));
    } catch {
      toast.error(t("hosts.failedToDuplicateHost"));
    }
  }

  const allHosts = collectAllHosts(children);
  const allFolderPaths = collectAllFolderPaths(children);

  const visibleRows = collectVisibleRows(children, query, openFolders);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = visibleRows[index];
      if (!row) return 36;
      if (isFolder(row.item)) return 36;
      // Fixed per density: rows no longer grow when a tray opens inside them, because there is
      // no tray — actions moved to the context menu.
      return compactHostView ? 28 : 48;
    },
    overscan: 12,
    getItemKey: (index) => {
      const row = visibleRows[index];
      if (!row) return index;
      return isFolder(row.item)
        ? `folder:${row.item.path ?? row.item.name}`
        : `host:${row.item.id}`;
    },
  });

  // Remeasure when the tree shape changes (rows added/removed/reordered), so
  // stale cached sizes from before don't leak onto different rows. Tray
  // open/close is intentionally excluded — `measureElement`'s ResizeObserver
  // already tracks that live via the CSS transition, and force-resetting the
  // cache here would snap rows back to the rough estimate mid-animation and
  // cause visible jitter.
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [
    virtualizer,
    openFolders,
    query,
    visibleRows.length,
    compactHostView,
    trayOnClick,
  ]);

  if (loading) {
    return (
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1.5">
          {[28, 20, 24, 20, 28, 20].map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 ${i % 2 === 1 ? "ml-4" : ""}`}
            >
              <div className="size-3 rounded-sm bg-muted/50 animate-pulse shrink-0" />
              <div
                className="h-3 rounded bg-muted/50 animate-pulse"
                style={{ width: `${w * 3}px` }}
              />
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 pt-4 text-muted-foreground/40">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">{t("hosts.loadingHosts")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div
        ref={parentRef}
        className={`flex-1 min-h-0 overflow-y-auto ${rootDragOver ? "ring-1 ring-inset ring-accent-brand/50" : ""}`}
        onDragOver={(e) => {
          if (draggedHostIds) {
            e.preventDefault();
            setRootDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setRootDragOver(false);
        }}
        onDrop={(e) => {
          if (draggedHostIds) {
            e.preventDefault();
            setRootDragOver(false);
            handleMoveHostsToFolder(draggedHostIds, "");
          }
        }}
      >
        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Server className="size-8 text-muted-foreground/20 mb-2" />
            <span className="text-sm font-semibold text-muted-foreground/60">
              {query ? t("hosts.noHostsMatchSearch") : t("hosts.noHostsYet")}
            </span>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const row = visibleRows[vItem.index];
              if (!row) return null;
              const { item, depth } = row;
              return (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  {isFolder(item) ? (
                    <FolderItem
                      folder={item}
                      depth={depth}
                      flat
                      onOpenTab={onOpenTab}
                      onEditHost={onEditHost}
                      onShareHost={onShareHost}
                      onDeleteHost={handleDeleteHost}
                      onDuplicateHost={handleDuplicateHost}
                      query={query}
                      openFolders={openFolders}
                      onToggleFolder={toggleFolder}
                      selectionMode={selectionMode}
                      selectedHostIds={selectedHostIds}
                      onToggleSelect={toggleSelect}
                      focusedHostIds={focusedHostIds}
                      onSelectHost={onSelectHost}
                      onManageFolder={handleManageFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onOpenAllSessions={handleOpenAllSessions}
                      onMoveHostsToFolder={handleMoveHostsToFolder}
                      draggedHostIds={draggedHostIds}
                      onDragHostStart={handleDragHostStart}
                      onDragEnd={() => setDraggedHostIds(null)}
                    />
                  ) : (
                    <HostItem
                      host={item}
                      depth={depth}
                      onOpenTab={(type) => onOpenTab(item, type)}
                      onEditHost={() => onEditHost(item)}
                      onShareHost={
                        onShareHost ? () => onShareHost(item) : undefined
                      }
                      onDelete={() => handleDeleteHost(item)}
                      onDuplicate={() => handleDuplicateHost(item)}
                      query={query}
                      selectionMode={selectionMode}
                      selected={selectedHostIds.has(item.id)}
                      onToggleSelect={() => toggleSelect(item.id)}
                      focused={focusedHostIds?.has(item.id) ?? false}
                      onSelect={(e) => onSelectHost?.(item, e)}
                      onDragStart={() => handleDragHostStart(item.id)}
                      onDragEnd={() => setDraggedHostIds(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      {selectionMode && (
        <div className="absolute bottom-4 inset-x-3 z-50">
          <div className="bg-popover border border-border shadow-xl px-2.5 py-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold tabular-nums shrink-0">
              {t("hosts.nSelected", { count: selectedHostIds.size })}
            </span>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 hover:bg-muted rounded transition-colors"
              onClick={() => {
                if (selectedHostIds.size === allHosts.length)
                  setSelectedHostIds(new Set());
                else setSelectedHostIds(new Set(allHosts.map((h) => h.id)));
              }}
            >
              {selectedHostIds.size === allHosts.length
                ? t("hosts.deselectAll")
                : t("hosts.selectAll")}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 hover:bg-muted rounded transition-colors flex items-center gap-1 disabled:opacity-40"
                  disabled={selectedHostIds.size === 0}
                >
                  {t("hosts.featuresMenu")} <ChevronDown className="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                {[
                  {
                    labelKey: "hosts.enableTerminalFeature",
                    field: "enableTerminal",
                    value: true,
                    icon: Terminal,
                  },
                  {
                    labelKey: "hosts.disableTerminalFeature",
                    field: "enableTerminal",
                    value: false,
                    icon: Terminal,
                  },
                  {
                    labelKey: "hosts.enableFilesFeature",
                    field: "enableFileManager",
                    value: true,
                    icon: FolderSearch,
                  },
                  {
                    labelKey: "hosts.disableFilesFeature",
                    field: "enableFileManager",
                    value: false,
                    icon: FolderSearch,
                  },
                  {
                    labelKey: "hosts.enableTunnelsFeature",
                    field: "enableTunnel",
                    value: true,
                    icon: Network,
                  },
                  {
                    labelKey: "hosts.disableTunnelsFeature",
                    field: "enableTunnel",
                    value: false,
                    icon: Network,
                  },
                ].map(({ labelKey, field, value, icon: Icon }) => (
                  <DropdownMenuItem
                    key={labelKey}
                    onClick={async () => {
                      const ids = Array.from(selectedHostIds).map(Number);
                      try {
                        await bulkUpdateSSHHosts(ids, { [field]: value });
                        window.dispatchEvent(
                          new CustomEvent("termelix:hosts-changed"),
                        );
                        toast.success(
                          t("hosts.updatedCount", { count: ids.length }),
                        );
                      } catch {
                        toast.error(t("hosts.bulkUpdateFailed"));
                      }
                    }}
                  >
                    <Icon className="size-3.5 mr-2" />
                    {t(labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 hover:bg-muted rounded transition-colors flex items-center gap-1 disabled:opacity-40"
                  disabled={selectedHostIds.size === 0}
                >
                  {t("hosts.moveMenu")} <ChevronDown className="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="text-xs">
                <DropdownMenuItem
                  onClick={async () => {
                    const ids = Array.from(selectedHostIds).map(Number);
                    try {
                      await bulkUpdateSSHHosts(ids, { folder: "" });
                      window.dispatchEvent(
                        new CustomEvent("termelix:hosts-changed"),
                      );
                      toast.success(t("hosts.movedToRoot"));
                    } catch {
                      toast.error(t("hosts.failedToMoveHosts"));
                    }
                  }}
                >
                  <FolderOpen className="size-3.5 mr-2" />
                  {t("hosts.noFolderOption")}
                </DropdownMenuItem>
                {allFolderPaths.map((f) => (
                  <DropdownMenuItem
                    key={f}
                    onClick={async () => {
                      const ids = Array.from(selectedHostIds).map(Number);
                      try {
                        await bulkUpdateSSHHosts(ids, { folder: f });
                        window.dispatchEvent(
                          new CustomEvent("termelix:hosts-changed"),
                        );
                        toast.success(t("hosts.movedToFolder", { folder: f }));
                      } catch {
                        toast.error(t("hosts.failedToMoveHosts"));
                      }
                    }}
                  >
                    <FolderOpen className="size-3.5 mr-2" />
                    {f}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 hover:bg-muted rounded transition-colors flex items-center gap-1 disabled:opacity-40"
              disabled={selectedHostIds.size === 0}
              onClick={() => {
                const selectedHosts = allHosts.filter((h) =>
                  selectedHostIds.has(String(h.id)),
                );
                for (const host of selectedHosts) {
                  if (host.enableSsh) onOpenTab(host, "terminal");
                }
                setSelectedHostIds(new Set());
                onToggleSelectionMode();
              }}
            >
              <Terminal className="size-3" />
              {t("hosts.connectSelected")}
            </button>
            <button
              className="text-[10px] text-destructive hover:text-destructive px-1.5 py-1 hover:bg-destructive/10 rounded transition-colors disabled:opacity-40"
              disabled={selectedHostIds.size === 0}
              onClick={() => {
                setConfirmDialog({
                  message: t("hosts.deleteHostsConfirm", {
                    count: selectedHostIds.size,
                    plural: selectedHostIds.size !== 1 ? "s" : "",
                  }),
                  onConfirm: async () => {
                    const ids = Array.from(selectedHostIds);
                    const results = await Promise.allSettled(
                      ids.map((id) => deleteSSHHost(Number(id))),
                    );
                    const succeeded = results.filter(
                      (r) => r.status === "fulfilled",
                    ).length;
                    const failed = results.filter(
                      (r) => r.status === "rejected",
                    ).length;
                    setSelectedHostIds(new Set());
                    window.dispatchEvent(
                      new CustomEvent("termelix:hosts-changed"),
                    );
                    if (succeeded > 0)
                      toast.success(
                        t("hosts.deletedCount", { count: succeeded }),
                      );
                    if (failed > 0)
                      toast.error(
                        t("hosts.failedToDeleteCount", { count: failed }),
                      );
                  },
                });
              }}
            >
              {t("hosts.deleteSelected")}
            </button>
            <div className="flex-1" />
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 hover:bg-muted rounded transition-colors"
              onClick={() => {
                onToggleSelectionMode();
                setSelectedHostIds(new Set());
              }}
            >
              {t("hosts.cancelSelection")}
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-popover border border-border shadow-xl w-full max-w-xs flex flex-col gap-4 p-4">
            <p className="text-sm text-foreground">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                {t("hosts.cancelBtn")}
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded transition-colors"
              >
                {t("hosts.deleteConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      <FolderMetadataDialog
        open={folderDialog !== null}
        mode={folderDialog?.mode ?? "create"}
        initial={
          folderDialog?.folder
            ? {
                name: folderDialog.folder.name,
                color: folderDialog.folder.color,
                icon: folderDialog.folder.icon,
              }
            : undefined
        }
        onOpenChange={(v) => !v && setFolderDialog(null)}
        onSubmit={handleSaveFolderMetadata}
      />
    </div>
  );
}
