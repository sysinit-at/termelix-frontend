import { tmuxMonitorApi } from "@/main-axios";

/** Per-pane / per-session activity, classified server-side from the foreground command
 * and the pane's process-tree CPU. See docs/TMUX_FEATURE_EVALUATION.md. */
export type TmuxStatus = "waiting" | "working" | "running" | "idle";

export interface TmuxPane {
  id: string;
  index: number;
  pid: number;
  active: boolean;
  width: number;
  height: number;
  command: string;
  path: string;
  title: string;
  /** Enriched by the overview: activity status, tree CPU, busiest descendant, ssh-family. */
  status?: TmuxStatus;
  cpuPercent?: number;
  topCommand?: string | null;
  isRemote?: boolean;
}

export interface TmuxWindow {
  index: number;
  name: string;
  active: boolean;
  panes: TmuxPane[];
}

export interface TmuxSessionOverview {
  name: string;
  created: number;
  lastActivity: number;
  attachedClients: number;
  windows: TmuxWindow[];
  tags: string[];
  /** Session-level roll-up of its panes' activity (highest-priority pane wins). */
  status?: TmuxStatus;
}

export interface TmuxOverview {
  available: boolean;
  sessions: TmuxSessionOverview[];
}

export interface TmuxSearchMatch {
  paneId: string;
  sessionName: string;
  windowIndex: number;
  line: number;
  text: string;
}

export interface TmuxPaneMetrics {
  paneId: string;
  sessionName: string;
  pid: number;
  processCount: number;
  cpuPercent: number;
  memRssKb: number;
  gpuMemMb: number;
  topCommand: string | null;
}

export async function getTmuxOverview(hostId: number): Promise<TmuxOverview> {
  const response = await tmuxMonitorApi.get(`/${hostId}/overview`);
  return response.data;
}

/** Select a pane's window+pane on the server so the attached terminal
 * (and any other attached client) switches to it. */
export async function focusTmuxPane(
  hostId: number,
  paneId: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/focus`, { paneId });
}

/** Create a new detached session on the host. Starts the tmux server if
 * none is running yet. */
export async function createTmuxSession(
  hostId: number,
  name: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/sessions`, { name });
}

/** Create a new window in an existing session. */
export async function createTmuxWindow(
  hostId: number,
  sessionName: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/windows`, { sessionName });
}

/** Rename a session. Saved tags follow the session to its new name. */
export async function renameTmuxSession(
  hostId: number,
  sessionName: string,
  newName: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/rename`, { sessionName, newName });
}

/** Kill a session (terminates all of its windows and processes). */
export async function killTmuxSession(
  hostId: number,
  sessionName: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/kill`, { sessionName });
}

/** Kill a window and every pane in it. */
export async function killTmuxWindow(
  hostId: number,
  sessionName: string,
  windowIndex: number,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/kill-window`, {
    sessionName,
    windowIndex,
  });
}

/** Kill a single pane (last pane of a window closes the window). */
export async function killTmuxPane(
  hostId: number,
  paneId: string,
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/kill-pane`, { paneId });
}

/** Split the window containing a pane: "h" adds a pane to the right,
 * "v" below (tmux -h/-v semantics). */
export async function splitTmuxPane(
  hostId: number,
  paneId: string,
  direction: "h" | "v",
): Promise<void> {
  await tmuxMonitorApi.post(`/${hostId}/split`, { paneId, direction });
}

export interface TmuxSearchResult {
  matches: TmuxSearchMatch[];
  /** True when a search limit was hit and the results are partial. */
  truncated: boolean;
  searchedLines: number;
  maxPanes: number;
}

export async function searchTmux(
  hostId: number,
  query: string,
): Promise<TmuxSearchResult> {
  const response = await tmuxMonitorApi.get(`/${hostId}/search`, {
    params: { q: query },
  });
  return {
    matches: response.data.matches ?? [],
    truncated: response.data.truncated ?? false,
    searchedLines: response.data.searchedLines ?? 0,
    maxPanes: response.data.maxPanes ?? 0,
  };
}

export async function getTmuxMetrics(
  hostId: number,
): Promise<TmuxPaneMetrics[]> {
  const response = await tmuxMonitorApi.get(`/${hostId}/metrics`);
  return response.data.panes ?? [];
}

export async function setTmuxSessionTags(
  hostId: number,
  sessionName: string,
  tags: string[],
): Promise<string[]> {
  const response = await tmuxMonitorApi.put(`/${hostId}/tags`, {
    sessionName,
    tags,
  });
  return response.data.tags ?? [];
}

export interface TmuxHostOverview {
  hostId: number;
  hostName: string;
  available: boolean;
  sessions: TmuxSessionOverview[];
  error: string | null;
}

/** Aggregate overview across every tmux-enabled host the user owns (one poll).
 * Backs the global tmux view. Each host reports independently — an unreachable
 * host comes back available:false with an error rather than failing the batch. */
export async function getTmuxOverviewAll(): Promise<TmuxHostOverview[]> {
  const response = await tmuxMonitorApi.get(`/overview`);
  return (response.data?.hosts ?? []) as TmuxHostOverview[];
}
