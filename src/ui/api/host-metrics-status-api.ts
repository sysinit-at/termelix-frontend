import axios, { type AxiosRequestConfig } from "axios";
import { handleApiError, statsApi } from "@/main-axios";
import type { ServerStatus } from "@/main-axios";
import { getCachedServerStatuses } from "@/lib/hosts-request-cache";

// Host reachability status — what powers the sidebar's online/offline indicators. The
// former Host Metrics dashboard (CPU/mem/disk collection + viewer lifecycle) was removed;
// only the status polling remains.

/**
 * Progressive retry schedule for the background /status poll: try(2s) -> wait 3s ->
 * try(5s) -> wait 5s -> try(8s) -> fail. Worst-case 23s fits inside the 30s
 * ServerStatusContext poll cadence, so the next tick acts as the next retry without overlap.
 */
const STATUS_RETRY_SCHEDULE: ReadonlyArray<{
  timeoutMs: number;
  pauseAfterMs: number | null;
}> = [
  { timeoutMs: 2000, pauseAfterMs: 3000 },
  { timeoutMs: 5000, pauseAfterMs: 5000 },
  { timeoutMs: 8000, pauseAfterMs: null },
];

function isTransientStatusError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (error.response) return false;
  const code = error.code;
  if (!code) return true;
  return (
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    code === "ERR_NETWORK" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET"
  );
}

export async function getAllServerStatuses(): Promise<
  Record<number, ServerStatus>
> {
  return getCachedServerStatuses(async () => {
    let lastError: unknown = null;

    for (let i = 0; i < STATUS_RETRY_SCHEDULE.length; i++) {
      const { timeoutMs, pauseAfterMs } = STATUS_RETRY_SCHEDULE[i];
      const isFinalAttempt = i === STATUS_RETRY_SCHEDULE.length - 1;

      try {
        const response = await statsApi.get("/status", {
          timeout: timeoutMs,
          __silentRetry: !isFinalAttempt,
        } as AxiosRequestConfig & { __silentRetry?: boolean });
        return response.data || {};
      } catch (error) {
        lastError = error;
        if (!isTransientStatusError(error)) break;
        if (pauseAfterMs === null) break;
        await new Promise((resolve) => setTimeout(resolve, pauseAfterMs));
      }
    }

    handleApiError(lastError, "fetch server statuses");
    return {};
  });
}

export async function getServerStatusById(id: number): Promise<ServerStatus> {
  try {
    const response = await statsApi.get(`/status/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "fetch server status");
    throw error;
  }
}

export async function refreshServerPolling(): Promise<void> {
  try {
    await statsApi.post("/refresh");
  } catch (error) {
    console.warn("Failed to refresh server polling:", error);
  }
}

export async function notifyHostCreatedOrUpdated(
  hostId: number,
): Promise<void> {
  try {
    await statsApi.post("/host-updated", { hostId });
  } catch (error) {
    console.warn("Failed to notify stats server of host update:", error);
  }
}
